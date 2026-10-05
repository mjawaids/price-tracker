// Stores on the Blink ordering platform (Chase Up, Spar, Bin Hashim). Their category
// pages render in the browser and robots.txt disallows /api/*, so we read each
// product's own page (server-rendered `__NEXT_DATA__`), found through the sitemap.
// One page per product is slow (1 a second), so this is a rolling refresh: each run
// reads new products first, then the ones checked longest ago, up to a page cap.
import { Blocked, Disallowed } from '../http.ts';
import { nextData, sitemapLocs } from '../html.ts';
import type { RawListing } from '../normalize.ts';
import type { AdapterContext, AdapterResult } from './types.ts';

export interface BlinkOptions {
  /**
   * The branch whose prices we import (the store's prices differ by branch and city).
   * Null when the store has one branch and its item prices are the ones shown.
   */
  branchId: number | null;
  /** Excluded listings (pharmacy, fashion, …) are looked at again after this many days. */
  recheckExcludedDays?: number;
}

interface BranchPrice {
  restbrId?: number;
  rest_brId?: number;
  price: string;
  discount_price: string;
  status: number;
}

interface Item {
  id: number;
  name: string;
  brand_name: string | null;
  price: string;
  discount_price: string;
  status: number;
  availability: number;
  category_name: string | null;
  sub_category_name: string | null;
  sub_sub_Category_name: string | null;
  dish_options?: unknown[] | null;
  dish_branch_status?: BranchPrice[] | BranchPrice | null;
}

const num = (s: string | number | null | undefined) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

/** A product page → what the site would show for our branch (the same rules as the site's own code). */
export function readItem(html: string, branchId: number | null): Item | 'missing' | null {
  const data = nextData(html) as { props?: { pageProps?: { prefetchedItem?: { status?: number; data?: Item[] } } } } | null;
  const pre = data?.props?.pageProps?.prefetchedItem;
  if (!pre) return null;
  const item = pre.data?.[0];
  if (!item) return pre.status === 404 ? 'missing' : null;
  const branches = Array.isArray(item.dish_branch_status) ? item.dish_branch_status : [];
  const mine = branchId == null ? undefined : branches.find((b) => (b.restbrId ?? b.rest_brId) === branchId);
  if (mine) return { ...item, price: mine.price, discount_price: mine.discount_price, status: item.status === 1 && mine.status === 1 ? 1 : 0 };
  return item;
}

export function toListing(item: Item, url: string, externalId: string): RawListing {
  const aisles = [item.sub_sub_Category_name, item.sub_category_name, item.category_name]
    .map((a) => (a ?? '').trim())
    .filter((a, i, all) => a && all.indexOf(a) === i);
  const discount = num(item.discount_price);
  const price = discount > 0 ? discount : num(item.price);
  const variants = (item.dish_options?.length ?? 0) > 0;
  return {
    externalId,
    name: item.name,
    brand: item.brand_name,
    price: variants ? 0 : price,
    available: item.status === 1 && item.availability === 1,
    url,
    aisles,
    exclude: variants ? 'variants' : price > 0 ? undefined : 'no-price',
  };
}

const DAY = 86_400_000;

export async function blinkPages(ctx: AdapterContext, o: BlinkOptions): Promise<AdapterResult> {
  const listings: RawListing[] = [];
  const gone: string[] = [];
  let status: AdapterResult['status'] = 'ok';
  let note: string | undefined;

  try {
    // 1. Every product URL from the sitemap (an index of product sitemaps, or one urlset).
    const urls = new Map<string, string>(); // external id → url
    const index = await ctx.http.get('/sitemap.xml', { Accept: 'application/xml,text/xml' });
    if (index.status !== 200) return { listings, gone, full: false, status: 'partial', note: `sitemap-${index.status}` };
    let sitemapOk = true;
    const addUrls = (locs: string[]) => {
      for (const u of locs) {
        const m = u.match(/\/product\/[^/?#]*-(\d+)$/);
        if (m && ctx.http.allowed(u)) urls.set(m[1], u);
      }
    };
    const locs = sitemapLocs(index.text);
    const children = locs.filter((u) => /sitemap[^/]*product/i.test(u) && /\.xml$/i.test(u));
    addUrls(locs);
    for (const child of children) {
      const res = await ctx.http.get(child, { Accept: 'application/xml,text/xml' });
      if (res.status === 200) addUrls(sitemapLocs(res.text));
      else sitemapOk = false;
    }
    ctx.log(`${urls.size} product pages in the sitemap`);

    // 2. What to read this run.
    const now = Date.now();
    const recheck = (o.recheckExcludedDays ?? 60) * DAY;
    const age = (id: string) => Date.parse(ctx.known.get(id)?.checkedAt ?? '') || 0;
    const fresh: string[] = [];
    const due: string[] = [];
    const excludedDue: string[] = [];
    for (const id of urls.keys()) {
      const k = ctx.known.get(id);
      if (!k) fresh.push(id);
      else if (!k.active) {
        // Gone before (e.g. 404) but still in the sitemap: look again weekly, not daily.
        if (now - age(id) > 7 * DAY) excludedDue.push(id);
      } else if (k.included) due.push(id);
      else if (now - age(id) > recheck) excludedDue.push(id);
    }
    due.sort((a, b) => age(a) - age(b));
    excludedDue.sort((a, b) => age(a) - age(b));
    const queue = [...fresh, ...due, ...excludedDue];

    // Listed before but not in a complete sitemap any more → gone. Skipped when the
    // sitemap looks broken (much smaller than what we know).
    const activeKnown = [...ctx.known].filter(([, k]) => k.active);
    if (sitemapOk && urls.size >= activeKnown.length * 0.5) {
      for (const [id] of activeKnown) if (!urls.has(id)) gone.push(id);
    }

    // 3. Read product pages until the cap (the sitemap doesn't count against it).
    let unreadable = 0;
    let pages = 0;
    for (const id of queue) {
      if (pages >= ctx.maxPages) {
        note = 'page-cap';
        break;
      }
      if (Date.now() > ctx.deadline) {
        note = 'time-cap';
        break;
      }
      pages++;
      const url = urls.get(id)!;
      let res;
      try {
        res = await ctx.http.get(url);
      } catch (e) {
        if (e instanceof Disallowed) continue;
        throw e;
      }
      if (res.status === 404 || res.status === 410) {
        gone.push(id);
        continue;
      }
      if (res.status !== 200) {
        unreadable++;
        continue;
      }
      const item = readItem(res.text, o.branchId);
      if (item === 'missing') gone.push(id);
      else if (item) listings.push(toListing(item, url, id));
      else unreadable++;
    }
    if (unreadable) ctx.log(`${unreadable} pages unreadable`);
    if (unreadable > Math.max(20, listings.length * 0.2)) {
      status = 'partial';
      note = 'unreadable-pages';
    }
    ctx.log(`${pages} product pages read · ${Math.max(0, queue.length - pages)} left for later runs`);
  } catch (e) {
    if (e instanceof Blocked) {
      status = 'blocked';
      note = e.code;
    } else throw e;
  }
  return { listings, gone, full: false, status, note };
}
