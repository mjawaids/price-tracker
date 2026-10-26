// Product name → structured fields, e.g.
//   "Olper's Milk Full Cream 1Ltr x 12" → Olper's · milk · "Full Cream" · 12 × 1000 ml
//   "Sabroso Chicken Chapli Kabab 10 Pieces 740g" → Sabroso · kebab · 10 × 74 g
// Used when importing a store catalogue and, on the fly, for products typed in
// by hand. Plain TS with no app imports so scripts can use it too.

import { findTypes, matchItemType, modifierWords, tokens } from './itemTypes.ts';
import type { CategoryHint, ItemType } from './itemTypes.ts';

export type SizeUnit = 'g' | 'ml' | 'pc';

export interface ParsedSize {
  /** Size of one unit in g, ml or pieces. */
  value: number;
  unit: SizeUnit;
  /** Units in the pack (12 for "12 x 250 ml"). */
  pack: number;
  /** Parts in different units ("20ml + 20g" hair colour): `value` is the first one only. */
  mixed?: boolean;
}

export interface ParsedProduct {
  /** Tidied display name (spacing, ALL-CAPS). */
  name: string;
  brand: string | null;
  itemType: ItemType | null;
  variant: string | null;
  size: ParsedSize | null;
  /** "Rs 50" price-point packs (the size is the price). */
  pricePoint: number | null;
  /** 0–1: how much of the name we understood. */
  confidence: number;
  /**
   * The item type fits the category hint (or there was none, a phrase of 2+ words named
   * it, or the count meets the type's `minUnits`). A doubtful one ("Bisconni Cocomo Milk
   * 24s Box" in a biscuit aisle → milk) is a misreading to drop, not a type to fill in.
   */
  typeConfident: boolean;
}

// ── Brands ───────────────────────────────────────────────────────────────────
// Seed list (seen in Karachi store catalogues). Imports learn more with learnBrands().
export const KNOWN_BRANDS = [
  "Adam's", 'Ariel', 'Bake Parlor', 'Bakea', 'Big Bird', 'Bisconni', "Brady's", 'Brightfarms', 'Brooke Bond',
  'Butterfly', 'Cadbury', 'Candyland', 'Colgate', 'Cool & Cool', 'Dabur', 'Dalda', 'Dawn', 'Dayfresh', 'Deen\'s',
  'Dettol', 'Dewdrop', 'Dipitt', 'Dove', 'Eva', 'Express', 'Falak', 'Farm Fresh', 'Fauji', 'Fay', 'Freedom',
  'Fruitamins', 'Garnier', 'Ghiza', 'Go Royale', 'Guard', 'Haadi', 'Habib', 'Haleeb', 'Harpic', 'Head & Shoulders',
  'Hemani', 'Hico', 'Igloo', 'Italiano', "K&N's", 'Knorr', 'Kolson', "Lay's", 'Lemon Max', 'Lifebuoy', 'Lipton',
  'LU', 'Lux', 'Mayfair', 'Meclay London', 'Menu', 'Mitchells', "Mitchell's", 'Molfix', 'Momse', 'Mon Salwa',
  'Mortein', 'Mughal', 'Nana Smarty', 'National', 'Nestle', 'Nivea', 'Nurpur', "Olper's", 'Omore', 'Palmolive',
  'Pantene', 'Peek Freans', 'Pepsi', "Pond's", 'Qarshi', 'Rafhan', 'Rani', 'Rose Petal', 'Sabroso', 'Safeguard',
  'Shan', 'Shangrila', 'Shezan', 'Sufi', 'Sunlight', 'Sunsilk', 'Super Crisp', 'Supreme', 'Surf Excel', 'Susu',
  'Tapal', 'Toren', 'Tux', 'United King', 'Vaseline', 'Vatika', 'Vim', 'Vital', "Wall's", "Young's", 'Zee Snacks',
];

/** Leading words that describe the product, not who makes it. */
const NOT_BRAND = new Set(
  [
    'fresh', 'frozen', 'organic', 'premium', 'imported', 'original', 'classic', 'the', 'mix', 'mixed', 'pure',
    'chinese', 'split', 'yellow', 'green', 'red', 'white', 'black', 'brown', 'golden', 'pink', 'new', 'special',
    'super', 'extra', 'large', 'small', 'medium', 'big', 'mini', 'family', 'value', 'pack', 'whole', 'baby',
    'desi', 'local', 'farm', 'home', 'kids', 'diet', 'sugar', 'low', 'full', 'double', 'single', 'hot', 'sweet',
    'spicy', 'plain', 'roasted', 'salted', 'unsalted', 'boneless', 'cleaned', 'premium', 'daily', 'best',
  ].map((w) => w.toLowerCase()),
);

const brandKey = (s: string) => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9&]+/g, ' ').trim();

/**
 * One id per brand however a store spells it: "Day Fresh" / "Dayfresh" / "DayFresh" →
 * "dayfresh", "Johnson's Baby" / "Johnsons Baby" → "johnsonsbaby". Products compare
 * brands by this, never by the spelling.
 */
export const brandId = (s: string) => s.toLowerCase().replace(/[^a-z0-9&]+/g, '');

/**
 * The spelling to store for a brand: the first of `known` (most used first) with the
 * same brandId, else the brand as given ("Day Fresh" → "Dayfresh" when that's more used).
 */
export function brandSpellings(known: string[]): (brand: string) => string {
  const byId = new Map<string, string>();
  for (const k of known) {
    const id = brandId(k);
    if (id && !byId.has(id)) byId.set(id, k);
  }
  return (brand) => byId.get(brandId(brand)) ?? brand;
}

// Words in a variant that don't tell two products apart: how a store abbreviates the
// type ("Flv Milk") and pack details (a tetra pack, a capped bottle). Per type: words
// that describe every product of that type ("liquid" milk).
const VARIANT_NOISE = new Set(['flv', 'flavour', 'flavor', 'flavored', 'flavoured', 'tetra', 'capped', 'uncapped']);
const VARIANT_NOISE_BY_TYPE: Record<string, string[]> = {
  milk: ['liquid', 'liquidmilk'],
  'flavoured-milk': ['liquid', 'milk'],
};
// Two ways stores write the same thing ("full fat" = "full cream", "lowfat" = "low fat").
const VARIANT_SPLIT: Record<string, string[]> = { lowfat: ['low', 'fat'], fullcream: ['full', 'cream'], fullfat: ['full', 'cream'] };

/**
 * A variant's telling words, sorted: what's left once noise and pack words are gone,
 * with synonyms written one way. Used by the importer's match key and the app's
 * "same product" grouping, so both see "Lactose Free Tetra" = "Lactose Free".
 */
export function variantKey(variant: string | null | undefined, itemType?: string | null): string {
  const typeNoise = new Set(itemType ? (VARIANT_NOISE_BY_TYPE[itemType] ?? []) : []);
  const words = tokens(variant ?? '').flatMap((w) => VARIANT_SPLIT[w] ?? [w]);
  const out = words
    .map((w, i) => (w === 'fat' && words[i - 1] === 'full' ? 'cream' : w))
    .filter((w) => !VARIANT_NOISE.has(w) && !PACKAGING.has(w) && !typeNoise.has(w));
  return [...new Set(out)].sort().join(' ');
}

// Sizes, counts and price points in a name ("900Gm", "1.5 Ltr", "12 x 250ml", "30 Bags",
// "6's", "Rs 50"): the size fields already hold them. A strength ("500mg", "6mg") stays.
const SIZE_WORDS =
  /\d+(?:[.,]\d+)?\s*(?:x\s*\d+(?:[.,]\d+)?\s*)?(?:kgs?|kilo(?:gram)?s?|grams?|gms?|gr|g|mls?|ltrs?|lt|litres?|liters?|l|cl|oz|lbs?|pcs?|pieces?|packs?|pk|sachets?|bags?|rolls?|sheets?|ply|count|ct|units?|eggs?|dozen|'?s)\b|\bx\s*\d+\b|\b\d+\s*x\b|\brs\.?\s*\d+/gi;

/**
 * What a product's name says it is, as a sorted list of words, for telling whether two
 * names are one product: the brand ("Day Fresh" / "Dayfresh", wherever it appears, in
 * any of `brands`), sizes and counts, pack words, filler and noise ("Flv", "Tetra") are
 * left out, and synonyms are written one way ("full fat" = "full cream"). Word order
 * doesn't matter: "Dayfresh Salted Butter 200g" and "Day Fresh Butter Salted 200gm"
 * give the same words; "Shan Ginger Paste" and "Shan Garlic Paste" don't.
 */
export function nameWords(name: string, brands: (string | null | undefined)[]): string[] {
  const ids = new Set(brands.filter((b): b is string => !!b).map(brandId).filter(Boolean));
  const brandWords = new Set(brands.filter((b): b is string => !!b).flatMap((b) => tokens(b)));
  const raw = tokens(
    tidyName(name)
      .replace(SIZE_WORDS, ' ')
      // "X-Large" is a size of its own, not filler "x" + "large".
      .replace(/\b(x{1,3})\s*-\s*(large|small)\b/gi, '$1$2'),
  );
  // A brand written as one word or several ("dayfresh", "day fresh").
  const kept: string[] = [];
  for (let i = 0; i < raw.length; i++) {
    let skip = 0;
    for (let k = 3; k >= 1 && !skip; k--) if (i + k <= raw.length && ids.has(raw.slice(i, i + k).join(''))) skip = k;
    if (skip) i += skip - 1;
    else if (!brandWords.has(raw[i])) kept.push(raw[i]);
  }
  const words = kept.flatMap((w) => VARIANT_SPLIT[w] ?? [w]);
  const out = words
    .map((w, i) => (w === 'fat' && words[i - 1] === 'full' ? 'cream' : w))
    .filter((w) => !VARIANT_NOISE.has(w) && !PACKAGING.has(w) && !SMALL_WORDS.has(w));
  return [...new Set(out)].sort();
}

/** Brands that start ≥ `min` names: the first word, or first two when those recur together. */
export function learnBrands(names: string[], min = 3): string[] {
  const one = new Map<string, { label: string; n: number }>();
  const two = new Map<string, { label: string; n: number }>();
  for (const raw of names) {
    const words = tidyName(raw).split(' ').filter(Boolean);
    if (words.length < 2) continue;
    const bump = (m: Map<string, { label: string; n: number }>, label: string) => {
      const k = brandKey(label);
      const cur = m.get(k);
      m.set(k, { label: cur?.label ?? label, n: (cur?.n ?? 0) + 1 });
    };
    bump(one, words[0]);
    if (words.length > 2) bump(two, `${words[0]} ${words[1]}`);
  }
  const known = new Set(KNOWN_BRANDS.map(brandKey));
  const ok = (label: string) => {
    const first = brandKey(label).split(' ')[0];
    return !!first && !NOT_BRAND.has(first) && !/^\d/.test(first) && !matchItemType(label);
  };
  const out: string[] = [];
  for (const v of two.values()) {
    const firstKey = brandKey(v.label.split(' ')[0]);
    const firstOnly = one.get(firstKey);
    // A two-word brand when the pair is most of the first word's uses (and the
    // first word isn't already a known brand: "Cadbury Dairy" is a product line).
    if (v.n >= min && ok(v.label) && !known.has(firstKey) && firstOnly && v.n >= firstOnly.n * 0.8) {
      out.push(v.label);
      one.delete(firstKey);
    }
  }
  for (const [k, v] of one) if (v.n >= min && ok(v.label) && !known.has(k)) out.push(v.label);
  return out;
}

// ── Sizes ────────────────────────────────────────────────────────────────────
const UNIT: Record<string, { unit: SizeUnit; mult: number }> = {
  g: { unit: 'g', mult: 1 }, gm: { unit: 'g', mult: 1 }, gms: { unit: 'g', mult: 1 }, gr: { unit: 'g', mult: 1 },
  grm: { unit: 'g', mult: 1 }, gram: { unit: 'g', mult: 1 }, grams: { unit: 'g', mult: 1 },
  kg: { unit: 'g', mult: 1000 }, kgs: { unit: 'g', mult: 1000 }, kilo: { unit: 'g', mult: 1000 },
  ml: { unit: 'ml', mult: 1 }, mls: { unit: 'ml', mult: 1 },
  l: { unit: 'ml', mult: 1000 }, lt: { unit: 'ml', mult: 1000 }, ltr: { unit: 'ml', mult: 1000 },
  ltrs: { unit: 'ml', mult: 1000 }, litre: { unit: 'ml', mult: 1000 }, liter: { unit: 'ml', mult: 1000 },
  litres: { unit: 'ml', mult: 1000 }, liters: { unit: 'ml', mult: 1000 },
};
const UNIT_RE = '(kgs?|kilo|grams?|grm|gms?|gr|g|mls?|ltrs?|litres?|liters?|lt|l)';
const NUM = '(\\d+(?:\\.\\d+)?)';
const COUNT_WORDS =
  '(pieces?|pcs?|packs?|packets?|bags?|tablets?|capsules?|softgels?|rolls?|sachets?|units?|strips?|pads|sheets|eggs|boxe?s?|bars?|cans?|bottles?|s)';

const RE = {
  nxSize: new RegExp(`(\\d+)\\s*x\\s*${NUM}\\s*${UNIT_RE}(?![a-z])`),
  sizeXn: new RegExp(`${NUM}\\s*${UNIT_RE}\\s*x\\s*(\\d+)(?![\\d.])`),
  range: new RegExp(`${NUM}\\s*${UNIT_RE}?\\s*-\\s*${NUM}\\s*${UNIT_RE}(?![a-z])`),
  size: new RegExp(`${NUM}\\s*${UNIT_RE}(?![a-z])`),
  packOf: /pack\s+of\s+(\d+)/,
  // Every part has its unit: "SPF 50+ 150ml" is not a bundle.
  bundle: new RegExp(`(?:${NUM}\\s*${UNIT_RE}\\s*\\+\\s*)+${NUM}\\s*${UNIT_RE}(?![a-z])`),
  part: new RegExp(`^${NUM}\\s*${UNIT_RE}$`),
  stripX: /(\d+)\s*strips?\s*x\s*(\d+)\s*(?:tablets?|capsules?|softgels?)/,
  count: new RegExp(`(\\d+)\\s*'?\\s*${COUNT_WORDS}(?![a-z])`),
  dozen: /(\d+(?:\.\d+)?)?\s*dozen/,
};

const unitOf = (u: string) => UNIT[u.toLowerCase()];

/** Size and pack count from a product name, or null. */
export function parseSize(rawName: string): ParsedSize | null {
  const s = rawName
    .toLowerCase()
    .replace(/×/g, 'x')
    .replace(/\(\s*0{3,}\d*\s*\)/g, ' ')
    .replace(/\brs\.?\s*-?\s*\d+/g, ' ') // "Rs. 30" is a price point, not a size ("Wafers 8s" isn't one)
    .replace(/\d+(?:\.\d+)?\s*mg\b/g, ' ') // medicine strength, not a size
    .replace(/\bomega\s*-?\s*3\b/g, 'omega') // "Omega 3 Eggs 12 Pieces" is 12 eggs, not 3
    .replace(/\b(vitamin\s+[a-z])-?\d+\b/g, '$1') // "Vitamin D3" (but "Vitamin D 12 Eggs" keeps its 12)
    .replace(/\d+(?:\.\d+)?\s*%/g, ' ');

  const metric = (n: string, u: string) => {
    const m = unitOf(u);
    return m ? { value: Number(n) * m.mult, unit: m.unit } : null;
  };

  // "50g+50g" is a twin pack; "195g+100g" (a bonus) is the total; "20ml+20g" is
  // two different things, so only the first size is kept and flagged.
  const bundle = s.match(RE.bundle);
  if (bundle) {
    const sizes = bundle[0].split('+').map((p) => {
      const part = p.trim().match(RE.part);
      return part ? metric(part[1], part[2]) : null;
    });
    if (sizes.every((x) => x && x.value > 0)) {
      const ok = sizes as { value: number; unit: SizeUnit }[];
      if (ok.some((x) => x.unit !== ok[0].unit)) return { ...ok[0], pack: 1, mixed: true };
      if (ok.every((x) => x.value === ok[0].value)) return { ...ok[0], pack: ok.length };
      return { value: round(ok.reduce((a, x) => a + x.value, 0)), unit: ok[0].unit, pack: 1 };
    }
  }

  let m = s.match(RE.nxSize);
  if (m) {
    const one = metric(m[2], m[3]);
    if (one) return { ...one, pack: Number(m[1]) || 1 };
  }
  m = s.match(RE.sizeXn);
  if (m) {
    const one = metric(m[1], m[2]);
    if (one) return { ...one, pack: Number(m[3]) || 1 };
  }

  let single: { value: number; unit: SizeUnit } | null = null;
  const r = s.match(RE.range);
  if (r) {
    const hi = metric(r[3], r[4]);
    const lo = metric(r[1], r[2] || r[4]);
    if (hi && lo && hi.unit === lo.unit) single = { value: Math.round((hi.value + lo.value) / 2), unit: hi.unit };
  }
  if (!single) {
    m = s.match(RE.size);
    if (m) single = metric(m[1], m[2]);
  }

  const packOf = s.match(RE.packOf);
  if (single && packOf) return { ...single, pack: Number(packOf[1]) || 1 };

  let count: number | null = null;
  const strip = s.match(RE.stripX);
  if (strip) count = Number(strip[1]) * Number(strip[2]);
  if (count == null) {
    const c = s.match(RE.count);
    if (c) count = Number(c[1]);
  }
  if (count == null) {
    const d = s.match(RE.dozen);
    if (d) count = Math.round((d[1] ? Number(d[1]) : 1) * 12);
  }

  if (single && count && count > 1) {
    // "3 Pieces x 130g": each piece is the size. "10 Pieces 740g": the size is the total.
    const each = new RegExp(`${count}\\s*'?\\s*${COUNT_WORDS}\\s*x\\s*${NUM}`).test(s);
    return each ? { ...single, pack: count } : { value: round(single.value / count), unit: single.unit, pack: count };
  }
  if (single) return { ...single, pack: 1 };
  if (count && count > 0) return { value: 1, unit: 'pc', pack: count };
  if (packOf) return { value: 1, unit: 'pc', pack: Number(packOf[1]) || 1 };
  return null;
}

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Whether a size fits what a type is sold as: a type with `minUnits` (eggs: 6)
 * needs at least that many units, so "Egg Pudding 78g" or "Surprise Egg 1 Unit"
 * isn't eggs. Unknown sizes fit.
 */
export function sizeFitsType(type: ItemType, size: ParsedSize | null): boolean {
  if (!type.minUnits || !size) return true;
  const units = size.unit === 'pc' ? size.value * size.pack : size.pack;
  return units >= type.minUnits;
}

// ── Names ────────────────────────────────────────────────────────────────────
const SMALL_WORDS = new Set(['and', 'of', 'with', 'in', 'for', 'the', 'a', 'or', 'x']);

/** Collapse spacing, drop stray codes, and soften ALL-CAPS names. */
export function tidyName(raw: string): string {
  let s = raw
    .replace(/[\uFFFD\u00A0]/g, ' ') // replacement char and no-break space seen in imports
    .replace(/\(\s*0{3,}\d*\s*\)/g, ' ')
    .replace(/\(\s*zm opened\s*&\s*checked\s*\)/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s*\.$/, '')
    .trim();
  const letters = s.replace(/[^A-Za-z]/g, '');
  const upper = s.replace(/[^A-Z]/g, '');
  if (letters.length > 3 && upper.length / letters.length > 0.8) {
    s = s
      .toLowerCase()
      .split(' ')
      .map((w, i) => (i > 0 && SMALL_WORDS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
      .join(' ');
  }
  // "400G" / "1LTR" → "400g" / "1ltr"
  return s.replace(/(\d)(G|GM|GMS|KG|ML|LTR|L)\b/g, (_, d: string, u: string) => d + u.toLowerCase());
}

const PACKAGING = new Set(
  [
    'pouch', 'bottle', 'jar', 'box', 'tin', 'pack', 'packet', 'packets', 'bag', 'can', 'refill', 'imported',
    'family', 'saver', 'value', 'ticky', 'standup', 'standing', 'promotion', 'combo', 'piece', 'pieces', 'pcs', 'pc',
    'unit', 'units', 'new', 'offer', 'deal', 'bundle', 'mega', 'jumbo', 'trio', 'twin',
  ],
);

function findBrand(name: string, extraBrands: string[] = []): string | null {
  const key = brandKey(name);
  const all = [...extraBrands, ...KNOWN_BRANDS].sort((a, b) => b.length - a.length);
  for (const b of all) {
    const bk = brandKey(b);
    if (key === bk || key.startsWith(`${bk} `)) return b;
  }
  return null;
}

/** Everything we can read from a product name. */
export function parseProductName(
  raw: string,
  opts: { categoryHint?: CategoryHint; brands?: string[] } = {},
): ParsedProduct {
  const name = tidyName(raw);
  const size = parseSize(name);
  const pp = name.match(/\brs\.?\s*-?\s*(\d+)/i);
  const pricePoint = pp ? Number(pp[1]) : null;
  const brand = findBrand(name, opts.brands);
  // The brand is always the leading words (see findBrand).
  const brandWords = brand ? brand.split(' ').length : 0;
  const afterBrand = brand ? name.split(' ').slice(brandWords).join(' ') : name;
  // Match on the whole name so a phrase that starts inside the brand still counts
  // ("Cadbury Dairy Milk" → chocolate), but not one that's only the brand ("Lemon Max").
  // Skip the name's own brand words: "OLPERS" is one token where "Olper's" is two.
  const skip = brand ? tokens(name.split(' ').slice(0, brandWords).join(' ')).length : 0;
  const typeMatch = matchItemType(name, opts.categoryHint, skip, (t) => sizeFitsType(t, size));
  const itemType = typeMatch?.type ?? null;

  // Variant: what's left once brand, item words, sizes, prices and packaging are gone.
  // A word that tells products of the type apart stays: "Shami Kabab Masala" keeps "shami".
  const kept = typeMatch ? modifierWords(typeMatch.type.id, typeMatch.words) : [];
  const typeWords = new Set((typeMatch?.words ?? []).filter((w) => !kept.includes(w)));
  const variantWords = afterBrand
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\brs\.?\s*-?\s*\d+/gi, ' ')
    .replace(/\d+(?:\.\d+)?\s*[a-z%']*/gi, ' ')
    .replace(/[|,+\-–/]/g, ' ')
    .split(/\s+/)
    .filter((w) => {
      const t = tokens(w)[0];
      return t && !typeWords.has(t) && !PACKAGING.has(t) && !SMALL_WORDS.has(t) && !/^x$/i.test(w);
    });
  const variant = variantWords.length ? variantWords.join(' ').slice(0, 80) : null;

  // A count of pieces that meets the type's minimum settles it in another aisle ("Egg
  // 12Pcs Classic" under Breakfast), when the name names nothing else ("Chicken Egg Roll
  // 6 Pcs" isn't eggs; "Easter Egg 6 x 25g" is no count of eggs) and the aisle isn't
  // snacks or frozen food ("Easter Eggs 6 Pcs" under Chocolates, egg rolls).
  const hints = !opts.categoryHint ? [] : typeof opts.categoryHint === 'string' ? [opts.categoryHint] : opts.categoryHint;
  const onlyType = !!itemType && findTypes(name, skip).every((m) => m.type.id === itemType.id);
  const counted =
    !!itemType?.minUnits && size?.unit === 'pc' && sizeFitsType(itemType, size) && onlyType &&
    !hints.some((h) => h === 'snacks' || h === 'frozen');
  const typeConfident = !!typeMatch?.confident || counted;
  const confidence =
    (brand ? 0.3 : 0) + (itemType ? (typeConfident ? 0.4 : 0.2) : 0) + (size ? 0.3 : 0);
  return { name, brand, itemType, variant, size, pricePoint, confidence: round(confidence), typeConfident };
}
