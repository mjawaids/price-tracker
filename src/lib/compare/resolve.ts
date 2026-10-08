// List item → the products it could be, and what each costs at each store.
//
// Precedence: a product pinned on the item → the user's "usual" for that name →
// a brand/size/words named in the text → the item type with an assumed default
// (the user's last buy, else the product most stores carry) → not compared.
import { normalizeName } from '../groceryDictionary.ts';
import { ITEM_TYPE_BY_ID, matchItemType, tokens, typeFamily } from './itemTypes.ts';
import type { ItemType } from './itemTypes.ts';
import { KNOWN_BRANDS, parseProductName } from './productName.ts';
import type { ParsedSize } from './productName.ts';
import { packsNeeded, productSize, similarSize } from './units.ts';
import type { LineOption } from './optimizer.ts';
import type { CatalogProduct, CurrentPrice, ItemPreference, PreferenceMode } from './types.ts';

/** What a product is, with gaps filled from its name. */
export interface ProductProfile {
  product: CatalogProduct;
  brand: string | null;
  brandKey: string | null;
  itemType: string | null;
  size: ParsedSize | null;
  words: Set<string>;
}

export interface ResolveContext {
  profiles: Map<string, ProductProfile>;
  byType: Map<string, ProductProfile[]>;
  brandKeys: Set<string>;
  /** productId → storeId → price (only stores being considered). */
  prices: Map<string, Map<string, CurrentPrice>>;
  preferences: Map<string, ItemPreference>;
  /** item type → the product the user last bought (from their own reports). */
  lastBought: Map<string, string>;
}

export type MatchStatus = 'pinned' | 'usual' | 'named' | 'assumed' | 'unpriced' | 'unknown';

export interface ItemInput {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  productId: string | null;
}

export interface ResolvedItem {
  item: ItemInput;
  key: string;
  status: MatchStatus;
  itemType: ItemType | null;
  mode: PreferenceMode;
  reference: ProductProfile | null;
  acceptable: ProductProfile[];
  options: LineOption[];
}

const brandKeyOf = (s: string) => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9&]+/g, ' ').trim();
const MAX_ACCEPTABLE = 40;

export function profileProduct(p: CatalogProduct): ProductProfile {
  const needsParse = !p.itemType || !p.sizeUnit || !p.brand;
  const parsed = needsParse ? parseProductName(p.name, { categoryHint: p.category }) : null;
  const brand = p.brand ?? parsed?.brand ?? null;
  return {
    product: p,
    brand,
    brandKey: brand ? brandKeyOf(brand) : null,
    itemType: p.itemType ?? parsed?.itemType?.id ?? null,
    size: productSize(p),
    words: new Set(tokens(`${p.name} ${p.variant ?? ''}`)),
  };
}

export function buildContext(input: {
  products: CatalogProduct[];
  prices: CurrentPrice[];
  storeIds: Set<string>;
  preferences?: ItemPreference[];
  lastBought?: Map<string, string>;
}): ResolveContext {
  const profiles = new Map<string, ProductProfile>();
  const byType = new Map<string, ProductProfile[]>();
  const brandKeys = new Set(KNOWN_BRANDS.map(brandKeyOf));
  for (const p of input.products) {
    if (p.status !== 'active') continue;
    const prof = profileProduct(p);
    profiles.set(p.id, prof);
    if (prof.itemType) byType.set(prof.itemType, [...(byType.get(prof.itemType) || []), prof]);
    if (prof.brandKey) brandKeys.add(prof.brandKey);
  }
  const prices = new Map<string, Map<string, CurrentPrice>>();
  for (const cp of input.prices) {
    if (!input.storeIds.has(cp.storeId)) continue;
    const m = prices.get(cp.productId) || new Map<string, CurrentPrice>();
    m.set(cp.storeId, cp);
    prices.set(cp.productId, m);
  }
  return {
    profiles,
    byType,
    brandKeys,
    prices,
    preferences: new Map((input.preferences || []).map((p) => [p.itemKey, p])),
    lastBought: input.lastBought || new Map(),
  };
}

/** Stores (being considered) where the product has a usable price (not one people say is wrong). */
const pricedAt = (ctx: ResolveContext, productId: string) =>
  [...(ctx.prices.get(productId)?.values() || [])].filter((p) => p.isAvailable && p.price != null && p.price > 0 && !p.disputed);

/** The product most of the user's stores carry (ties: more reports). */
function mostCarried(ctx: ResolveContext, list: ProductProfile[]): ProductProfile | null {
  let best: ProductProfile | null = null;
  let bestScore = -1;
  for (const p of list) {
    const at = pricedAt(ctx, p.product.id);
    const score = at.length * 1000 + at.reduce((a, x) => a + x.nReports, 0);
    if (score > bestScore) {
      best = p;
      bestScore = score;
    }
  }
  return best;
}

/** Products acceptable for a reference product under a mode. */
export function expand(ctx: ResolveContext, ref: ProductProfile, mode: PreferenceMode): ProductProfile[] {
  if (mode === 'exact' || !ref.itemType) return [ref];
  const pool = ctx.byType.get(ref.itemType) || [];
  const out = pool.filter(
    (p) =>
      p.product.id === ref.product.id ||
      (similarSize(p.size, ref.size) && (mode === 'any_size' || (!!ref.brandKey && p.brandKey === ref.brandKey))),
  );
  if (!out.some((p) => p.product.id === ref.product.id)) out.unshift(ref);
  // Keep the list manageable: priced ones first.
  return out
    .sort((a, b) => pricedAt(ctx, b.product.id).length - pricedAt(ctx, a.product.id).length)
    .slice(0, MAX_ACCEPTABLE);
}

function optionsFor(ctx: ResolveContext, item: ItemInput, acceptable: ProductProfile[]): LineOption[] {
  const out: LineOption[] = [];
  for (const p of acceptable) {
    const packs = packsNeeded(item, p.size);
    for (const cp of pricedAt(ctx, p.product.id)) {
      out.push({ storeId: cp.storeId, productId: p.product.id, packs, unitPrice: cp.price!, total: Math.round(cp.price! * packs * 100) / 100 });
    }
  }
  return out;
}

/** Brand named at the start or anywhere in the text ("dawn bread", "bread dawn"). */
function namedBrand(ctx: ResolveContext, text: string): string | null {
  const t = brandKeyOf(text);
  let best: string | null = null;
  for (const b of ctx.brandKeys) {
    if (b.length < 2) continue;
    if (t === b || t.startsWith(`${b} `) || t.endsWith(` ${b}`) || t.includes(` ${b} `)) {
      if (!best || b.length > best.length) best = b;
    }
  }
  return best;
}

export function resolveItem(ctx: ResolveContext, item: ItemInput): ResolvedItem {
  const key = normalizeName(item.name);
  const base = { item, key };
  const finish = (
    status: MatchStatus,
    itemType: ItemType | null,
    mode: PreferenceMode,
    reference: ProductProfile | null,
    acceptable: ProductProfile[],
  ): ResolvedItem => {
    const options = optionsFor(ctx, item, acceptable);
    return { ...base, status: options.length || status === 'unknown' ? status : 'unpriced', itemType, mode, reference, acceptable, options };
  };
  const typeOf = (p: ProductProfile | null) => (p?.itemType ? ITEM_TYPE_BY_ID.get(p.itemType) ?? null : null);

  // 1. A product pinned on the item.
  const pinned = item.productId ? ctx.profiles.get(item.productId) : undefined;
  const pref = ctx.preferences.get(key);
  if (pinned) {
    const mode = pref?.mode ?? 'exact';
    return finish('pinned', typeOf(pinned), mode, pinned, expand(ctx, pinned, mode));
  }

  // 2. The user's usual for this name.
  if (pref) {
    const ref = (pref.refProductId && ctx.profiles.get(pref.refProductId)) || ctx.profiles.get(pref.productIds[0] ?? '');
    if (ref) {
      const acceptable =
        pref.mode === 'exact'
          ? pref.productIds.map((id) => ctx.profiles.get(id)).filter((p): p is ProductProfile => !!p)
          : expand(ctx, ref, pref.mode);
      return finish('usual', typeOf(ref), pref.mode, ref, acceptable.length ? acceptable : [ref]);
    }
  }

  // 3–4. Read the text: item type, brand, extra words.
  const brandKey = namedBrand(ctx, item.name);
  const nameNoBrand = brandKey ? brandKeyOf(item.name).replace(brandKey, ' ') : item.name;
  const match = matchItemType(nameNoBrand);
  const type = match?.type ?? null;

  if (type) {
    const family = typeFamily(type.id);
    let pool = [...family].flatMap((id) => ctx.byType.get(id) || []);
    let named = false;
    if (brandKey) {
      const withBrand = pool.filter((p) => p.brandKey === brandKey);
      if (withBrand.length) {
        pool = withBrand;
        named = true;
      }
    }
    // Words beyond the generic name ("brown" bread, "full cream" milk) narrow it softly.
    const generic = new Set(
      [type, type.parent ? ITEM_TYPE_BY_ID.get(type.parent) : undefined]
        .filter((x): x is ItemType => !!x)
        .flatMap((t) => t.keywords.filter((k) => !k.includes(' ')).map((k) => tokens(k)[0])),
    );
    const extra = tokens(nameNoBrand).filter((w) => !generic.has(w) && !/^\d/.test(w));
    if (extra.length) {
      const narrowed = pool.filter((p) => extra.every((w) => p.words.has(w)));
      if (narrowed.length) {
        pool = narrowed;
        named = true;
      }
    }
    if (!pool.length) return finish('unknown', type, 'any_size', null, []);

    const last = ctx.lastBought.get(type.id);
    const lastProfile = last ? pool.find((p) => p.product.id === last) : undefined;
    const ref = lastProfile ?? mostCarried(ctx, pool);
    if (!ref) return finish('unknown', type, 'any_size', null, []);
    const mode: PreferenceMode = named ? (brandKey ? 'brand_size' : 'any_size') : type.swapBrands ? 'any_size' : 'exact';
    const acceptable = named && !brandKey ? expand(ctx, ref, mode).filter((p) => pool.includes(p) || p === ref) : expand(ctx, ref, mode);
    return finish(named ? 'named' : 'assumed', type, mode, ref, acceptable);
  }

  // 5. No item type: look for products whose names contain every word typed ("nutella").
  const words = tokens(item.name).filter((w) => !/^\d/.test(w));
  if (words.length) {
    const hits = [...ctx.profiles.values()].filter((p) => words.every((w) => p.words.has(w)));
    const ref = mostCarried(ctx, hits);
    if (ref) return finish('named', typeOf(ref), 'exact', ref, [ref]);
  }
  return finish('unknown', null, 'exact', null, []);
}
