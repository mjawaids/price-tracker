// Compare data access (app only — uses the Supabase client). Reads go through
// RLS: public catalogue rows plus the user's own. Writes are always the user's own
// private rows or their own price reports (see docs/compare-data.md).
import { supabase } from '../supabase';
import type { BranchSuggestion, CatalogProduct, CatalogStore, CurrentPrice, ItemPreference, PreferenceMode, Region, StoreDeliveryRule } from './types';

const PAGE = 1000;

// ── Row shapes (snake_case, as returned by select) ──────────────────────────
interface RegionRow {
  id: string;
  name: string;
  country_code: string;
  currency: string;
  status: Region['status'];
  sort_order: number;
}
interface StoreRow {
  id: string;
  owner_id: string | null;
  region_id: string | null;
  chain: string | null;
  name: string;
  kind: CatalogStore['kind'];
  address: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  delivery_rule: StoreDeliveryRule | null;
  website: string | null;
  phone: string | null;
  status: CatalogStore['status'];
  updated_at: string;
}
interface ProductRow {
  id: string;
  owner_id: string | null;
  name: string;
  brand: string | null;
  variant: string | null;
  item_type: string | null;
  category: string | null;
  size_value: number | string | null;
  size_unit: CatalogProduct['sizeUnit'];
  pack_count: number | null;
  unit_label: string | null;
  gtin: string | null;
  image_url: string | null;
  status: CatalogProduct['status'];
  merged_into: string | null;
  updated_at: string;
}
interface PriceRow {
  store_id: string;
  product_id: string;
  price: number | string | null;
  currency: string | null;
  is_available: boolean;
  observed_at: string;
  n_reports: number;
  confidence: number;
  disputed?: boolean;
  updated_at: string;
  product?: ProductRow | null;
}
interface ReportRow {
  store_id: string;
  product_id: string;
  price: number | string | null;
  currency: string | null;
  is_available: boolean;
  observed_at: string;
  status: string;
}
interface PreferenceRow {
  item_key: string;
  mode: PreferenceMode;
  product_ids: string[] | null;
  ref_product_id: string | null;
  updated_at: string;
}
export interface PlanRecord {
  id: string;
  listId: string | null;
  total: number;
  savings: number;
  storeCount: number;
  createdAt: string;
}

const num = (v: number | string | null | undefined) => (v == null ? null : Number(v));

export const toRegion = (r: RegionRow): Region => ({
  id: r.id, name: r.name, countryCode: r.country_code, currency: r.currency, status: r.status, sortOrder: r.sort_order,
});

export const toStore = (r: StoreRow): CatalogStore => ({
  id: r.id, ownerId: r.owner_id, regionId: r.region_id, chain: r.chain, name: r.name, kind: r.kind,
  address: r.address, city: r.city, lat: r.lat, lng: r.lng, deliveryRule: r.delivery_rule ?? { type: 'none' },
  website: r.website, phone: r.phone, status: r.status, updatedAt: r.updated_at,
});

export const toProduct = (r: ProductRow): CatalogProduct => ({
  id: r.id, ownerId: r.owner_id, name: r.name, brand: r.brand, variant: r.variant, itemType: r.item_type,
  category: r.category, sizeValue: num(r.size_value), sizeUnit: r.size_unit, packCount: r.pack_count || 1,
  unitLabel: r.unit_label, gtin: r.gtin, imageUrl: r.image_url, status: r.status, mergedInto: r.merged_into,
  updatedAt: r.updated_at,
});

const toPrice = (r: PriceRow): CurrentPrice => ({
  storeId: r.store_id, productId: r.product_id, price: num(r.price), currency: r.currency, isAvailable: r.is_available,
  observedAt: r.observed_at, nReports: r.n_reports, confidence: r.confidence,
  ...(r.disputed ? { disputed: true } : {}),
});

/** current_prices columns the app reads. */
const PRICE_COLS = 'store_id,product_id,price,currency,is_available,observed_at,n_reports,confidence,disputed,updated_at';

const STORE_COLS = 'id,owner_id,region_id,chain,name,kind,address,city,lat,lng,delivery_rule,website,phone,status,updated_at';
const PRODUCT_COLS =
  'id,owner_id,name,brand,variant,item_type,category,size_value,size_unit,pack_count,unit_label,gtin,image_url,status,merged_into,updated_at';

/** A Supabase error with its Postgres/PostgREST code ("42501" refused by a policy, "54000" daily limit). */
export class ApiError extends Error {
  readonly code: string | null;
  constructor(message: string, code: string | null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

/** Throws on a Supabase error so callers can keep their cached data. */
function check<T>(res: { data: T | null; error: { message: string; code?: string } | null }): T {
  if (res.error) throw new ApiError(res.error.message, res.error.code ?? null);
  return (res.data ?? ([] as unknown)) as T;
}

// ── Reads ────────────────────────────────────────────────────────────────────

export async function fetchRegions(): Promise<Region[]> {
  const rows = check(await supabase.from('regions').select('id,name,country_code,currency,status,sort_order').order('sort_order'));
  return (rows as RegionRow[]).map(toRegion);
}

/** The user's own stores plus the public ones in their city. */
export async function fetchStores(userId: string, regionId: string | null): Promise<CatalogStore[]> {
  const own = supabase.from('catalog_stores').select(STORE_COLS).eq('owner_id', userId);
  const pub = regionId
    ? supabase.from('catalog_stores').select(STORE_COLS).is('owner_id', null).eq('region_id', regionId).eq('status', 'active')
    : null;
  const [a, b] = await Promise.all([own, pub ?? Promise.resolve({ data: [], error: null })]);
  return [...(check(a) as StoreRow[]), ...(check(b) as StoreRow[])].map(toStore);
}

/** Store ids per current-prices request (they go in the URL). */
const STORE_CHUNK = 40;

/** "storeId:productId" — how the app keys a current price. */
export const pairKey = (storeId: string, productId: string) => `${storeId}:${productId}`;

/**
 * Current prices at the given stores, each with its product. `since` limits it to
 * rows changed after a cursor (delta refresh). Rows with `n_reports = 0` are
 * tombstones (the price is gone) and come back as `removed` pair keys.
 */
export async function fetchPrices(
  storeIds: string[],
  since: string | null,
): Promise<{ prices: CurrentPrice[]; removed: string[]; products: CatalogProduct[]; cursor: string | null }> {
  const prices: CurrentPrice[] = [];
  const removed: string[] = [];
  const products = new Map<string, CatalogProduct>();
  let cursor = since;
  if (!storeIds.length) return { prices, removed, products: [], cursor };
  // A few dozen stores at a time, so the request URL stays short (a city's branches add up).
  for (let i = 0; i < storeIds.length; i += STORE_CHUNK) {
    const chunk = storeIds.slice(i, i + STORE_CHUNK);
    for (let from = 0; ; from += PAGE) {
      let q = supabase
        .from('current_prices')
        .select(`${PRICE_COLS},product:catalog_products(${PRODUCT_COLS})`)
        .in('store_id', chunk)
        .order('updated_at', { ascending: true })
        .order('product_id', { ascending: true })
        .range(from, from + PAGE - 1);
      if (since) q = q.gt('updated_at', since);
      const rows = check(await q) as unknown as PriceRow[];
      for (const r of rows) {
        if (!cursor || r.updated_at > cursor) cursor = r.updated_at;
        if (r.n_reports <= 0) {
          removed.push(pairKey(r.store_id, r.product_id));
          continue;
        }
        prices.push(toPrice(r));
        if (r.product) products.set(r.product.id, toProduct(r.product));
      }
      if (rows.length < PAGE) break;
    }
  }
  return { prices, removed, products: [...products.values()], cursor };
}

/** The user's own products (including ones without prices yet). */
export async function fetchOwnProducts(userId: string): Promise<CatalogProduct[]> {
  const out: CatalogProduct[] = [];
  for (let from = 0; ; from += PAGE) {
    const rows = check(
      await supabase.from('catalog_products').select(PRODUCT_COLS).eq('owner_id', userId).order('id').range(from, from + PAGE - 1),
    ) as ProductRow[];
    out.push(...rows.map(toProduct));
    if (rows.length < PAGE) break;
  }
  return out;
}

/** Products by id (pinned items, preferences) that aren't loaded yet. */
export async function fetchProductsById(ids: string[]): Promise<CatalogProduct[]> {
  const out: CatalogProduct[] = [];
  for (let i = 0; i < ids.length; i += 150) {
    const rows = check(await supabase.from('catalog_products').select(PRODUCT_COLS).in('id', ids.slice(i, i + 150))) as ProductRow[];
    out.push(...rows.map(toProduct));
  }
  return out;
}

/** The user's own reports from the last 30 days (newest first): they win for them. */
export async function fetchOwnReports(userId: string): Promise<CurrentPrice[]> {
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const rows = check(
    await supabase
      .from('price_reports')
      .select('store_id,product_id,price,currency,is_available,observed_at,status')
      .eq('user_id', userId)
      .gte('observed_at', since)
      .neq('source', 'dispute')
      .order('observed_at', { ascending: false })
      .limit(2000),
  ) as ReportRow[];
  return rows.map((r) => ({
    storeId: r.store_id, productId: r.product_id, price: num(r.price), currency: r.currency, isAvailable: r.is_available,
    observedAt: r.observed_at, nReports: 1, confidence: 1, mine: true,
    ...(r.status === 'pending' ? { held: true } : {}),
  }));
}

export async function fetchPreferences(): Promise<ItemPreference[]> {
  const rows = check(await supabase.from('item_preferences').select('item_key,mode,product_ids,ref_product_id,updated_at')) as PreferenceRow[];
  return rows.map((r) => ({ itemKey: r.item_key, mode: r.mode, productIds: r.product_ids || [], refProductId: r.ref_product_id, updatedAt: r.updated_at }));
}

export async function fetchMyStores(): Promise<string[]> {
  const rows = check(await supabase.from('user_stores').select('store_id')) as { store_id: string }[];
  return rows.map((r) => r.store_id);
}

const SUGGESTION_COLS = 'id,store_id,region_id,chain,area,status,promoted_store_id,decided_at,created_at';
interface SuggestionRow {
  id: string;
  store_id: string | null;
  region_id: string;
  chain: string;
  area: string;
  status: BranchSuggestion['status'];
  promoted_store_id: string | null;
  decided_at: string | null;
  created_at: string;
}
const toSuggestion = (r: SuggestionRow): BranchSuggestion => ({
  id: r.id, storeId: r.store_id, regionId: r.region_id, chain: r.chain, area: r.area, status: r.status,
  promotedStoreId: r.promoted_store_id, decidedAt: r.decided_at, createdAt: r.created_at,
});

/** The user's shops suggested as shared ones (open, promoted or declined). */
export async function fetchSuggestions(): Promise<BranchSuggestion[]> {
  const rows = check(await supabase.from('branch_suggestions').select(SUGGESTION_COLS).order('created_at', { ascending: false })) as SuggestionRow[];
  return rows.map(toSuggestion);
}

/** Plans applied since the start of this month. */
export async function fetchPlansThisMonth(): Promise<PlanRecord[]> {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const rows = check(
    await supabase.from('plans').select('id,list_id,total,savings,store_count,created_at').gte('created_at', start.toISOString()).order('created_at', { ascending: false }),
  ) as { id: string; list_id: string | null; total: number | string; savings: number | string; store_count: number; created_at: string }[];
  return rows.map((r) => ({ id: r.id, listId: r.list_id, total: Number(r.total), savings: Number(r.savings), storeCount: r.store_count, createdAt: r.created_at }));
}

// ── Writes (own rows only; RLS enforces it) ──────────────────────────────────

export interface StoreInput {
  name: string;
  kind: CatalogStore['kind'];
  regionId: string | null;
  deliveryRule: StoreDeliveryRule;
  address?: string | null;
  website?: string | null;
}

const cleanUrl = (u?: string | null) => {
  const t = (u || '').trim();
  return /^https?:\/\/[^\s]+$/i.test(t) && t.length <= 300 ? t : null;
};

const storePayload = (s: StoreInput) => ({
  name: s.name.trim().slice(0, 80),
  kind: s.kind,
  region_id: s.regionId,
  delivery_rule: s.deliveryRule,
  address: s.address?.trim().slice(0, 200) || null,
  website: cleanUrl(s.website),
});

export async function insertStore(s: StoreInput): Promise<CatalogStore> {
  const row = check(await supabase.from('catalog_stores').insert(storePayload(s)).select(STORE_COLS).single()) as StoreRow;
  return toStore(row);
}

export async function updateStoreRow(id: string, s: StoreInput): Promise<CatalogStore> {
  const row = check(await supabase.from('catalog_stores').update(storePayload(s)).eq('id', id).select(STORE_COLS).single()) as StoreRow;
  return toStore(row);
}

export async function deleteStoreRow(id: string): Promise<void> {
  check(await supabase.from('catalog_stores').delete().eq('id', id));
}

export interface ProductInput {
  name: string;
  brand: string | null;
  variant: string | null;
  itemType: string | null;
  category: string | null;
  sizeValue: number | null;
  sizeUnit: CatalogProduct['sizeUnit'];
  packCount: number;
  unitLabel: string | null;
  imageUrl?: string | null;
}

const productPayload = (p: ProductInput) => ({
  name: p.name.trim().slice(0, 160),
  brand: p.brand?.trim().slice(0, 60) || null,
  variant: p.variant?.trim().slice(0, 80) || null,
  item_type: p.itemType && /^[a-z0-9-]{1,40}$/.test(p.itemType) ? p.itemType : null,
  category: p.category?.slice(0, 60) || null,
  size_value: p.sizeValue && p.sizeUnit ? p.sizeValue : null,
  size_unit: p.sizeValue && p.sizeUnit ? p.sizeUnit : null,
  pack_count: Math.min(1000, Math.max(1, Math.round(p.packCount || 1))),
  unit_label: p.unitLabel?.trim().slice(0, 40) || null,
  image_url: p.imageUrl && /^https:\/\/[^\s]+$/i.test(p.imageUrl) ? p.imageUrl : null,
});

export async function insertProduct(p: ProductInput): Promise<CatalogProduct> {
  const row = check(await supabase.from('catalog_products').insert(productPayload(p)).select(PRODUCT_COLS).single()) as ProductRow;
  return toProduct(row);
}

export async function updateProductRow(id: string, p: ProductInput): Promise<CatalogProduct> {
  const row = check(await supabase.from('catalog_products').update(productPayload(p)).eq('id', id).select(PRODUCT_COLS).single()) as ProductRow;
  return toProduct(row);
}

export async function deleteProductRow(id: string): Promise<void> {
  check(await supabase.from('catalog_products').delete().eq('id', id));
}

/** 'dispute' = "this price is wrong" (the shown price, never counted as a price). */
export type ReportSource = 'manual' | 'trip' | 'confirm' | 'receipt' | 'dispute';

/**
 * A report's status after its statement finished. The insert returns `pending` before
 * the price trigger runs, and the trigger may accept it at once (someone else already
 * agrees), so a `pending` answer is read again.
 */
async function settledStatus(ids: string[]): Promise<Map<string, 'accepted' | 'pending'>> {
  const out = new Map<string, 'accepted' | 'pending'>();
  if (!ids.length) return out;
  const rows = check(await supabase.from('price_reports').select('id,status').in('id', ids)) as { id: string; status: 'accepted' | 'pending' }[];
  for (const r of rows) out.set(r.id, r.status);
  return out;
}

export async function insertReport(r: {
  storeId: string;
  productId: string;
  price: number | null;
  currency: string | null;
  isAvailable: boolean;
  source: ReportSource;
}): Promise<'accepted' | 'pending'> {
  const row = check(
    await supabase
      .from('price_reports')
      .insert({
        store_id: r.storeId,
        product_id: r.productId,
        price: r.price == null ? null : Math.round(r.price * 100) / 100,
        currency: r.currency,
        is_available: r.isAvailable,
        source: r.source,
      })
      .select('id,status')
      .single(),
  ) as { id: string; status: 'accepted' | 'pending' };
  if (row.status !== 'pending') return row.status;
  return (await settledStatus([row.id])).get(row.id) ?? row.status;
}

/** A price report to add in a batch (price checks while shopping, and ones sent later). */
export interface NewReport {
  storeId: string;
  productId: string;
  price: number | null;
  currency: string | null;
  isAvailable: boolean;
  source: ReportSource;
  /** When it was seen; the server's now when absent. */
  observedAt?: string;
}

/**
 * Several reports in one statement, each with its status once the statement finished
 * (a held one may be accepted by the same statement). Callers send one row per store
 * and product: a second within 10 minutes would replace the first.
 */
export async function insertReports(rows: NewReport[]): Promise<{ id: string; storeId: string; productId: string; status: 'accepted' | 'pending' }[]> {
  if (!rows.length) return [];
  const saved = check(
    await supabase
      .from('price_reports')
      .insert(
        rows.map((r) => ({
          store_id: r.storeId,
          product_id: r.productId,
          price: r.price == null ? null : Math.round(r.price * 100) / 100,
          currency: r.currency,
          is_available: r.isAvailable,
          source: r.source,
          ...(r.observedAt ? { observed_at: r.observedAt } : {}),
        })),
      )
      .select('id,store_id,product_id,status'),
  ) as { id: string; store_id: string; product_id: string; status: 'accepted' | 'pending' }[];
  const settled = await settledStatus(saved.filter((r) => r.status === 'pending').map((r) => r.id));
  return saved.map((r) => ({ id: r.id, storeId: r.store_id, productId: r.product_id, status: settled.get(r.id) ?? r.status }));
}

// ── Your contributions ──────────────────────────────────────────────────────
/** The user's own reports counted (spendless.my_contributions); the parts add up to `total`. */
export interface ContributionStats {
  total: number;
  /** Added since the start of this month (local). */
  month: number;
  /** Different stores. */
  shops: number;
  shared: number;
  /** Only the user for now: far from the usual price, waiting for someone to agree. */
  held: number;
  /** At the user's own stores. */
  private: number;
  outOfStock: number;
  disputes: number;
  other: number;
}

export async function fetchContributionStats(monthStart: Date): Promise<ContributionStats> {
  const r = check(await supabase.rpc('my_contributions', { p_month_start: monthStart.toISOString() })) as Record<string, unknown> | null;
  const n = (k: string) => Math.max(0, Number(r?.[k] ?? 0) || 0);
  return {
    total: n('total'), month: n('month'), shops: n('shops'), shared: n('shared'), held: n('held'), private: n('private'),
    outOfStock: n('out_of_stock'), disputes: n('disputes'), other: n('other'),
  };
}

/** One of the user's own price reports, as Your contributions lists it. */
export interface MyReport {
  id: string;
  storeId: string;
  productId: string;
  price: number | null;
  isAvailable: boolean;
  observedAt: string;
  /** null when it came from this device's copy (offline), which doesn't keep it. */
  source: string | null;
  status: 'accepted' | 'pending' | 'rejected';
}

/** The user's reports, newest seen first, a page at a time. */
export async function fetchMyReports(userId: string, offset: number, limit: number): Promise<MyReport[]> {
  const rows = check(
    await supabase
      .from('price_reports')
      .select('id,store_id,product_id,price,is_available,observed_at,source,status')
      .eq('user_id', userId)
      // A merge's copy of a report isn't another contribution (the original is listed).
      .is('copy_of', null)
      .order('observed_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + limit - 1),
  ) as { id: string; store_id: string; product_id: string; price: number | string | null; is_available: boolean; observed_at: string; source: string; status: MyReport['status'] }[];
  return rows.map((r) => ({
    id: r.id, storeId: r.store_id, productId: r.product_id, price: num(r.price), isAvailable: r.is_available,
    observedAt: r.observed_at, source: r.source, status: r.status,
  }));
}

/** Names of stores or products the snapshot doesn't hold (another city, say), by id. */
export async function fetchNames(table: 'catalog_stores' | 'catalog_products', ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (let i = 0; i < ids.length; i += 100) {
    const rows = check(await supabase.from(table).select('id,name').in('id', ids.slice(i, i + 100))) as { id: string; name: string }[];
    for (const r of rows) out.set(r.id, r.name);
  }
  return out;
}

/** Most prices saved from one receipt (the daily limit is 500). */
export const MAX_RECEIPT_REPORTS = 150;

/** How a product name is compared when a receipt reuses one (spaces and case ignored; same as save_receipt). */
export const productKey = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();

/** One price on a receipt: for a product, or for a new private product (a medicine). */
export type ReceiptPrice = { price: number } & ({ productId: string } | { newProduct: ProductInput });

export interface ReceiptSaved {
  reports: { id: string; productId: string; status: 'accepted' | 'pending' }[];
  /** The product each item was saved to, in order (new, reused or given). */
  itemProducts: string[];
  /** Products made by this save (to add to the snapshot). */
  created: CatalogProduct[];
}

/**
 * A receipt in one transaction (spendless.save_receipt): new private products,
 * reusing the user's own product with the same name, then every price. All saved
 * or none — the daily limit or a refused row rolls back the new products too.
 */
export async function saveReceipt(storeId: string, observedAt: string | null, currency: string | null, items: ReceiptPrice[]): Promise<ReceiptSaved> {
  if (!items.length) return { reports: [], itemProducts: [], created: [] };
  if (items.length > MAX_RECEIPT_REPORTS) throw new ApiError('Too many prices in one receipt', 'batch');
  const payload = items.map((it) => {
    const price = Math.round(it.price * 100) / 100;
    if ('productId' in it) return { product_id: it.productId, price };
    const { name, brand, variant, item_type, category, size_value, size_unit, pack_count } = productPayload(it.newProduct);
    return { new_product: { name, brand, variant, item_type, category, size_value, size_unit, pack_count }, price };
  });
  const out = check(
    await supabase.rpc('save_receipt', {
      p_store_id: storeId,
      p_observed_at: observedAt,
      p_currency: currency && /^[A-Z]{3}$/.test(currency) ? currency : null,
      p_items: payload,
    }),
  ) as {
    reports: { id: string; product_id: string; status: 'accepted' | 'pending' }[];
    products: { key: string; id: string; created: boolean; row: ProductRow | null }[];
    item_products: string[];
  };
  const held = (out.reports ?? []).filter((r) => r.status === 'pending').map((r) => r.id);
  const settled = held.length ? await settledStatus(held).catch(() => new Map<string, 'accepted' | 'pending'>()) : new Map<string, 'accepted' | 'pending'>();
  return {
    reports: (out.reports ?? []).map((r) => ({ id: r.id, productId: r.product_id, status: settled.get(r.id) ?? r.status })),
    itemProducts: out.item_products ?? [],
    created: (out.products ?? []).filter((p) => p.created && p.row).map((p) => toProduct(p.row as ProductRow)),
  };
}

/** Take back the user's own reports (Undo). */
export async function deleteReports(ids: string[]): Promise<void> {
  for (let i = 0; i < ids.length; i += 150) {
    check(await supabase.from('price_reports').delete().in('id', ids.slice(i, i + 150)));
  }
}

/** Current prices of some products at one store; products with none come back in `removed`. */
export async function fetchPricesAt(storeId: string, productIds: string[]): Promise<{ prices: CurrentPrice[]; removed: string[] }> {
  const prices: CurrentPrice[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < productIds.length; i += 150) {
    const rows = check(
      await supabase
        .from('current_prices')
        .select(PRICE_COLS)
        .eq('store_id', storeId)
        .in('product_id', productIds.slice(i, i + 150)),
    ) as PriceRow[];
    for (const r of rows) {
      if (r.n_reports <= 0) continue;
      prices.push(toPrice(r));
      seen.add(r.product_id);
    }
  }
  return { prices, removed: productIds.filter((id) => !seen.has(id)) };
}

/** The current price of one pair; `price: null` when there is none (or it's a tombstone). */
export async function fetchPrice(storeId: string, productId: string): Promise<{ price: CurrentPrice | null }> {
  const rows = check(
    await supabase
      .from('current_prices')
      .select(PRICE_COLS)
      .eq('store_id', storeId)
      .eq('product_id', productId)
      .limit(1),
  ) as PriceRow[];
  return { price: rows[0] && rows[0].n_reports > 0 ? toPrice(rows[0]) : null };
}

export async function upsertPreference(userId: string, p: Omit<ItemPreference, 'updatedAt'>): Promise<void> {
  check(
    await supabase.from('item_preferences').upsert(
      {
        user_id: userId,
        item_key: p.itemKey.slice(0, 120),
        mode: p.mode,
        product_ids: p.productIds.slice(0, 50),
        ref_product_id: p.refProductId,
      },
      { onConflict: 'user_id,item_key' },
    ),
  );
}

export async function deletePreference(itemKey: string): Promise<void> {
  check(await supabase.from('item_preferences').delete().eq('item_key', itemKey));
}

/** Replace the user's store picks. */
export async function saveMyStores(userId: string, storeIds: string[], previous: string[]): Promise<void> {
  const remove = previous.filter((id) => !storeIds.includes(id));
  const add = storeIds.filter((id) => !previous.includes(id));
  if (remove.length) check(await supabase.from('user_stores').delete().in('store_id', remove));
  if (add.length) check(await supabase.from('user_stores').insert(add.map((store_id) => ({ user_id: userId, store_id }))));
}

/**
 * Suggest one of your own in-store shops as a shared one. The database sets the city
 * (from the shop), the keys and the status; it refuses a shop that isn't yours, open
 * and in-store in a live city (42501), a second suggestion for it (23505), too many
 * waiting (54000) or a name it doesn't take (23514).
 */
export async function insertSuggestion(s: { storeId: string; regionId: string; chain: string; area: string }): Promise<BranchSuggestion> {
  const row = check(
    await supabase
      .from('branch_suggestions')
      .insert({ store_id: s.storeId, region_id: s.regionId, chain: s.chain, area: s.area })
      .select(SUGGESTION_COLS)
      .single(),
  ) as SuggestionRow;
  return toSuggestion(row);
}

/** Withdraw a suggestion still waiting. False when nothing was deleted (it was decided meanwhile). */
export async function deleteSuggestion(id: string): Promise<boolean> {
  const rows = check(await supabase.from('branch_suggestions').delete().eq('id', id).select('id')) as { id: string }[];
  return rows.length > 0;
}

export async function insertPlan(p: {
  listId: string | null;
  regionId: string | null;
  currency: string | null;
  total: number;
  baselineTotal: number | null;
  savings: number;
  storeCount: number;
  itemCount: number;
}): Promise<PlanRecord> {
  const row = check(
    await supabase
      .from('plans')
      .insert({
        list_id: p.listId,
        region_id: p.regionId,
        currency: p.currency,
        total: Math.round(p.total * 100) / 100,
        baseline_total: p.baselineTotal == null ? null : Math.round(p.baselineTotal * 100) / 100,
        savings: Math.max(0, Math.round(p.savings * 100) / 100),
        store_count: Math.min(20, p.storeCount),
        item_count: Math.min(500, p.itemCount),
      })
      .select('id,list_id,total,savings,store_count,created_at')
      .single(),
  ) as { id: string; list_id: string | null; total: number; savings: number; store_count: number; created_at: string };
  return { id: row.id, listId: row.list_id, total: Number(row.total), savings: Number(row.savings), storeCount: row.store_count, createdAt: row.created_at };
}

/** Items in the old Compare cart ("My Cart"), for the one-time conversion to a list. */
export async function fetchLegacyCart(): Promise<{ productId: string; quantity: number }[]> {
  const rows = check(await supabase.from('shopping_lists').select('name,items').order('updated_at', { ascending: false })) as {
    name: string;
    items: { productId?: string; quantity?: number }[] | null;
  }[];
  const cart = rows.find((r) => r.name === 'My Cart') ?? rows[0];
  return (cart?.items || [])
    .filter((i) => typeof i.productId === 'string' && /^[0-9a-f-]{36}$/i.test(i.productId))
    .map((i) => ({ productId: i.productId as string, quantity: Math.max(1, Math.round(Number(i.quantity) || 1)) }));
}
