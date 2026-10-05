// Imtiaz (shop.imtiaz.com.pk): the shop's own menu feed for one branch — the same
// JSON its web app loads. It has no robots.txt, so nothing is disallowed; we still
// make one request for the menu (plus the sitemap for product links).
import { Blocked, Disallowed } from '../http.ts';
import { sitemapLocs } from '../html.ts';
import type { RawListing } from '../normalize.ts';
import type { AdapterContext, AdapterResult } from './types.ts';

export interface ImtiazOptions {
  restId: number;
  branchId: number;
  appName: string;
}

interface Dish {
  id: number;
  name: string;
  brand_name: string | null;
  price: string;
  discount_price: string;
  status: number;
  availability: number;
  dish_options?: unknown[] | null;
}
interface Named {
  name: string;
  status: number;
}
interface Category extends Named {
  all_section?: (Named & { all_sub_section?: (Named & { dish?: Dish[] })[] })[];
}

export async function imtiazMenu(ctx: AdapterContext, o: ImtiazOptions): Promise<AdapterResult> {
  const headers = { 'app-name': o.appName, 'rest-id': String(o.restId), Accept: 'application/json' };
  try {
    const urls = new Map<string, string>();
    const sm = await ctx.http.get('/sitemap.xml', { Accept: 'application/xml,text/xml' });
    if (sm.status === 200) {
      for (const u of sitemapLocs(sm.text)) {
        const m = u.match(/\/product\/[^/?#]*-(\d+)$/);
        if (m) urls.set(m[1], u);
      }
    }

    const res = await ctx.http.get(`/api/menu?restId=${o.restId}&rest_brId=${o.branchId}&delivery_type=0&source=`, headers);
    if (res.status !== 200) return { listings: [], gone: [], full: false, status: 'partial', note: `menu-${res.status}` };
    const body = JSON.parse(res.text) as { data?: Category[] };
    if (!Array.isArray(body.data)) return { listings: [], gone: [], full: false, status: 'partial', note: 'bad-response' };

    const seen = new Map<string, RawListing>();
    for (const cat of body.data) {
      if (cat.status !== 1) continue;
      for (const sec of cat.all_section ?? []) {
        if (sec.status !== 1) continue;
        for (const sub of sec.all_sub_section ?? []) {
          if (sub.status !== 1) continue;
          for (const d of sub.dish ?? []) {
            const id = String(d.id);
            if (seen.has(id)) continue;
            const discount = Number(d.discount_price) || 0;
            const price = discount > 0 ? discount : Number(d.price) || 0;
            const variants = (d.dish_options?.length ?? 0) > 0;
            seen.set(id, {
              externalId: id,
              name: d.name,
              brand: d.brand_name,
              price: variants ? 0 : price,
              available: d.status === 1 && d.availability === 1,
              url: urls.get(id) ?? null,
              aisles: [sub.name, sec.name, cat.name],
              exclude: variants ? 'variants' : price > 0 ? undefined : 'no-price',
            });
          }
        }
      }
    }
    ctx.log(`${seen.size} products in the branch menu`);
    // The whole menu came back, so anything we listed before and don't see now is gone.
    return { listings: [...seen.values()], gone: [], full: seen.size > 0, status: 'ok' };
  } catch (e) {
    if (e instanceof Blocked) return { listings: [], gone: [], full: false, status: 'blocked', note: e.code };
    if (e instanceof Disallowed) return { listings: [], gone: [], full: false, status: 'blocked', note: 'robots' };
    throw e;
  }
}
