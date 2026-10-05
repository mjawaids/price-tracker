// A store listing → the catalogue product it describes, plus a match key so the
// same product from two stores becomes one catalogue row.
import { parseProductName, tidyName } from '../../src/lib/compare/productName.ts';
import { decideAisle } from './aisles.ts';

/** What every adapter produces. */
export interface RawListing {
  /** The store's own id for the product. */
  externalId: string;
  name: string;
  /** The store's brand field, if it has one. */
  brand?: string | null;
  /** Price of one pack as sold, in PKR (0 when the store shows none). */
  price: number;
  available: boolean;
  url?: string | null;
  /** The store's aisle names, most specific first. */
  aisles: string[];
  /** Why we can't import it (e.g. priced by variant). Kept as an excluded listing so it isn't re-read daily. */
  exclude?: string;
}

export interface ProductFields {
  name: string;
  brand: string | null;
  variant: string | null;
  item_type: string | null;
  category: string | null;
  size_value: number | null;
  size_unit: 'g' | 'ml' | 'pc' | null;
  pack_count: number;
  match_key: string;
}

export interface Normalized {
  external_id: string;
  url: string | null;
  source_name: string;
  source_category: string | null;
  included: boolean;
  /** Null only for excluded listings without a usable price. */
  price: number | null;
  available: boolean;
  product: ProductFields | null;
}

const key = (s: string) => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const round3 = (n: number) => Math.round(n * 1000) / 1000;

// Sizes, pack counts and price points ("900Gm", "1.5 Ltr", "12 x 250ml", "5Pcs", "Rs 50"), which the key already holds.
const SIZE_LIKE =
  /\d+(?:[.,]\d+)?\s*(?:x\s*\d+(?:[.,]\d+)?\s*)?(?:kgs?|kilo(?:gram)?s?|grams?|gms?|gr|g|mg|mls?|ltrs?|lt|litres?|liters?|l|cl|oz|lbs?|pcs?|pieces?|packs?|pk|sachets?|bags?|rolls?|sheets?|tabs?|tablets?|capsules?|caps|ply|count|ct|units?|eggs?|dozen|s)\b|\bx\s*\d+\b|\b\d+\s*x\b|rs\.?\s*\d+/gi;

/** The other numbers in a name ("Bf1" → 1, "Nido 3+" → 3): they tell stage 1 from stage 2. */
export function nameNumbers(name: string): string {
  const rest = tidyName(name).replace(SIZE_LIKE, ' ');
  return (rest.match(/\d+(?:\.\d+)?/g) ?? []).sort().join(',');
}

/**
 * '' unless we're confident: brand, item type and size all read from the name. The
 * parsed variant drops numbers, so the name's other numbers are part of the key too:
 * two products may only share a key when everything we can read says they're the same.
 */
export function matchKey(p: Omit<ProductFields, 'match_key' | 'name' | 'category'>, confidence: number, name: string): string {
  if (!p.brand || !p.item_type || !p.size_value || !p.size_unit || confidence < 0.7) return '';
  const variant = key(p.variant ?? '').split(' ').filter(Boolean).sort().join(' ');
  return [key(p.brand), p.item_type, variant, `${round3(p.size_value)}${p.size_unit}`, `x${p.pack_count}`, nameNumbers(name)]
    .join('|')
    .slice(0, 200);
}

const httpsOnly = (u: string | null | undefined) => (u && /^https:\/\/[^\s]+$/i.test(u) && u.length <= 500 ? u : null);

export function normalize(raw: RawListing, brands: string[]): Normalized | null {
  const name = raw.name.replace(/\s+/g, ' ').trim();
  const priced = raw.price > 0 && raw.price < 10_000_000;
  if (!name || !raw.externalId || (!priced && !raw.exclude)) return null;
  const storeBrand = raw.brand?.replace(/\s+/g, ' ').trim() || null;
  // The store's aisle is a hint for reading the name; the item type read from the name then has the last word.
  const storeAisle = raw.exclude ? null : decideAisle(raw.aisles, null, name).aisle;
  const parsed = parseProductName(name, { categoryHint: storeAisle, brands: storeBrand ? [...brands, storeBrand] : brands });
  // A type that contradicts the store's aisle, read from one loose word ("Apple Orchard"
  // car gel → apple), is a misreading: drop it and keep the store's aisle.
  const typeWeight = parsed.confidence - (parsed.brand ? 0.3 : 0) - (parsed.size ? 0.3 : 0);
  const itemType = parsed.itemType && typeWeight > 0.35 ? parsed.itemType : null;
  const typeAisle = itemType?.category ?? null;
  const decision = raw.exclude ? { aisle: null, include: false } : decideAisle(raw.aisles, typeAisle, name);
  const base = {
    external_id: raw.externalId.slice(0, 120),
    url: httpsOnly(raw.url),
    source_name: name.slice(0, 200),
    source_category: raw.aisles.filter(Boolean).join(' › ').slice(0, 160) || null,
    included: decision.include,
    price: priced ? Math.round(raw.price * 100) / 100 : null,
    available: raw.available,
  };
  if (!decision.include || base.price == null) return { ...base, included: false, product: null };

  const brand = (parsed.brand ?? storeBrand)?.slice(0, 60) || null;
  const sized = !!parsed.size && parsed.size.value > 0 && parsed.size.value < 1_000_000;
  const fields = {
    brand,
    variant: parsed.variant?.slice(0, 80) || null,
    item_type: itemType?.id ?? null,
    size_value: sized ? Math.round(parsed.size!.value * 1000) / 1000 : null,
    size_unit: sized ? parsed.size!.unit : null,
    pack_count: Math.min(1000, Math.max(1, Math.round(parsed.size?.pack ?? 1))),
  };
  // A brand the store told us about counts like one we read from the name. The key
  // uses the type as read even when we don't show it: a misreading is still the same
  // misreading at every store, so it still fingerprints the product.
  const confidence = parsed.confidence + (!parsed.brand && storeBrand ? 0.3 : 0);
  const keyFields = { ...fields, item_type: parsed.itemType?.id ?? null };
  return {
    ...base,
    product: {
      name: (parsed.name || name).slice(0, 160),
      category: decision.aisle,
      ...fields,
      match_key: matchKey(keyFields, confidence, name),
    },
  };
}
