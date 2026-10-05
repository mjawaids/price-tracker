// Magento 2 stores with a public GraphQL endpoint (Diamond Super Market).
// One POST per page of 100 products, per category we compare.
import { Blocked } from '../http.ts';
import type { RawListing } from '../normalize.ts';
import type { AdapterContext, AdapterResult } from './types.ts';

export interface MagentoOptions {
  /** Magento store view (Diamond: one per branch; prices are the same across branches). */
  storeCode: string;
  /** Top-level category ids to read. */
  categoryIds: string[];
  pageSize?: number;
}

const QUERY = `query ($cat: String!, $size: Int!, $page: Int!) {
  products(filter: { category_id: { eq: $cat } }, pageSize: $size, currentPage: $page) {
    page_info { total_pages }
    items { sku name url_key url_suffix stock_status categories { id name level path }
      price_range { minimum_price { final_price { value currency } } } }
  }
}`;

interface Item {
  sku: string;
  name: string;
  url_key: string | null;
  url_suffix: string | null;
  stock_status: string;
  categories: { id: number; name: string; level: number; path: string | null }[] | null;
  price_range: { minimum_price: { final_price: { value: number; currency: string } } };
}

export async function magentoGraphql(ctx: AdapterContext, o: MagentoOptions): Promise<AdapterResult> {
  const seen = new Map<string, RawListing>();
  const size = o.pageSize ?? 100;
  let complete = true;
  let status: AdapterResult['status'] = 'ok';
  let note: string | undefined;
  outer: for (const cat of o.categoryIds) {
    for (let page = 1; ; page++) {
      if (ctx.http.requests >= ctx.maxPages || Date.now() > ctx.deadline) {
        complete = false;
        status = 'partial';
        note = ctx.http.requests >= ctx.maxPages ? 'page-cap' : 'time-cap';
        break outer;
      }
      let res;
      try {
        res = await ctx.http.post('/graphql', JSON.stringify({ query: QUERY, variables: { cat, size, page } }), {
          'Content-Type': 'application/json',
          Store: o.storeCode,
        });
      } catch (e) {
        if (e instanceof Blocked) return { listings: [...seen.values()], gone: [], full: false, status: 'blocked', note: e.code };
        throw e;
      }
      if (res.status !== 200) {
        complete = false;
        status = 'partial';
        note = `http-${res.status}`;
        break;
      }
      const body = JSON.parse(res.text) as { data?: { products?: { page_info: { total_pages: number }; items: Item[] } } };
      const products = body.data?.products;
      if (!products) {
        complete = false;
        status = 'partial';
        note = 'bad-response';
        break;
      }
      for (const it of products.items) {
        const price = it.price_range?.minimum_price?.final_price;
        if (!price || price.currency !== 'PKR') continue;
        // Aisles from the tree we asked for, most specific first. A product also sits
        // in promotion categories ("Rabi ul Awal Promotion"), which say nothing about it.
        const all = it.categories || [];
        const inTree = all.filter((c) => String(c.id) === cat || (c.path ?? '').split('/').includes(cat));
        const cats = [...(inTree.length ? inTree : all)].sort((a, b) => b.level - a.level);
        const deep = inTree.length ? cats : cats.filter((c) => c.level >= 3);
        if (seen.has(it.sku)) continue; // already read under another category
        seen.set(it.sku, {
          externalId: it.sku,
          name: it.name,
          price: price.value,
          available: it.stock_status === 'IN_STOCK',
          url: it.url_key ? `${ctx.http.origin}/${o.storeCode}/${it.url_key}${it.url_suffix ?? ''}` : null,
          aisles: (deep.length ? deep : cats).slice(0, 3).map((c) => c.name),
        });
      }
      if (page >= products.page_info.total_pages) break;
    }
  }
  ctx.log(`${seen.size} products from ${o.categoryIds.length} categories`);
  return { listings: [...seen.values()], gone: [], full: complete, status, note };
}
