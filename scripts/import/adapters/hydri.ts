// Hydri Super Market (hydrisupermarket.com.pk): server-rendered category pages.
// Page 1 is the category URL; later pages come from the site's own "page_filter"
// form post (24 products a page). Each product card carries hidden inputs with its
// title, the price you pay, brand and category path; a sold-out card has no
// "Add to cart" button.
import { leftOut } from '../aisles.ts';
import { Blocked, Disallowed } from '../http.ts';
import { decodeEntities, slugWords } from '../html.ts';
import type { RawListing } from '../normalize.ts';
import type { AdapterContext, AdapterResult } from './types.ts';

const PER_PAGE = 24;
const MAX_PAGES_PER_CATEGORY = 80;

/** Leaf category paths ("dairybreak-fast/milk-cream") linked from the home page menu. */
export function categoryPaths(html: string, origin: string): string[] {
  const esc = origin.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  const re = new RegExp(`href=["']${esc}/([a-z0-9-]+(?:/[a-z0-9-]+){1,2})/?["']`, 'gi');
  const paths = new Set<string>();
  for (const m of html.matchAll(re)) {
    const p = m[1].toLowerCase();
    if (/-m\d+$/.test(p)) continue; // a product
    paths.add(p);
  }
  // Keep leaves: drop a category whose sub-categories are listed too.
  const all = [...paths];
  return all.filter((p) => !all.some((q) => q !== p && q.startsWith(`${p}/`))).sort();
}

const attr = (html: string, id: string) => {
  const m = html.match(new RegExp(`id=['"]${id}['"]\\s*value=['"]([^'"]*)['"]`));
  return m ? decodeEntities(m[1]) : null;
};

/** Product cards on one listing page. */
export function parseCards(html: string, origin: string): { listings: RawListing[]; total: number | null } {
  const s = html.replace(/\s+/g, ' ');
  const urls = new Map<string, string>();
  const esc = origin.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  for (const m of s.matchAll(new RegExp(`href="(${esc}/[a-z0-9-]+-m(\\d+))"`, 'gi'))) urls.set(m[2], m[1]);
  const inCart = new Set([...s.matchAll(/add_to_cart_btn-(\d+)/g)].map((m) => m[1]));
  const listings: RawListing[] = [];
  for (const m of s.matchAll(/id='title(\d+)' value='([^']*)'/g)) {
    const id = m[1];
    const price = Number(attr(s, `price${id}`));
    const path = (attr(s, `g_categorys${id}`) ?? '').split('/').filter(Boolean);
    listings.push({
      externalId: id,
      name: decodeEntities(m[2]),
      brand: attr(s, `g_brand${id}`),
      price: Number.isFinite(price) ? price : 0,
      available: inCart.has(id),
      url: urls.get(id) ?? null,
      aisles: path.reverse().map(slugWords),
    });
  }
  const total = Number(attr(s, 'page_num_count'));
  return { listings, total: Number.isFinite(total) && total > 0 ? total : null };
}

export async function hydri(ctx: AdapterContext): Promise<AdapterResult> {
  const seen = new Map<string, RawListing>();
  let status: AdapterResult['status'] = 'ok';
  let note: string | undefined;
  let complete = true;
  const stop = (why: string, st: AdapterResult['status'] = 'partial') => {
    complete = false;
    status = st;
    note = why;
  };

  try {
    const home = await ctx.http.get('/');
    if (home.status !== 200) return { listings: [], gone: [], full: false, status: 'partial', note: `home-${home.status}` };
    const paths = categoryPaths(home.text, ctx.http.origin).filter((p) => !leftOut(p.split('/').map(slugWords)));
    ctx.log(`${paths.length} categories to read`);

    outer: for (const path of paths) {
      let seg1: string | null = null;
      let total: number | null = null;
      for (let page = 1; page <= MAX_PAGES_PER_CATEGORY; page++) {
        if (ctx.http.requests >= ctx.maxPages) {
          stop('page-cap');
          break outer;
        }
        if (Date.now() > ctx.deadline) {
          stop('time-cap');
          break outer;
        }
        let res;
        if (page === 1) {
          res = await ctx.http.get(`/${path}`);
        } else {
          if (!seg1) break;
          const form = new FormData();
          form.append('category_id', '');
          form.append('page_num', String(page));
          form.append('sort_by', '');
          form.append('sort_order', '');
          form.append('current_cat', seg1);
          res = await ctx.http.post('/search/page_filter', form, { Referer: `${ctx.http.origin}/${path}` });
        }
        if (res.status !== 200) {
          stop(`http-${res.status}`);
          break; // next category
        }
        if (page === 1) seg1 = attr(res.text, 'seg1');
        const parsed = parseCards(res.text, ctx.http.origin);
        total = parsed.total ?? total;
        let fresh = 0;
        for (const l of parsed.listings) {
          if (!seen.has(l.externalId)) fresh++;
          seen.set(l.externalId, l);
        }
        if (parsed.listings.length < PER_PAGE || fresh === 0) break;
        if (total != null && page * PER_PAGE >= total) break;
      }
    }
  } catch (e) {
    if (e instanceof Blocked) stop(e.code, 'blocked');
    else if (e instanceof Disallowed) stop('robots');
    else throw e;
  }
  ctx.log(`${seen.size} products`);
  return { listings: [...seen.values()], gone: [], full: complete && status === 'ok', status, note };
}
