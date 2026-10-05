// Product name → structured fields, e.g.
//   "Olper's Milk Full Cream 1Ltr x 12" → Olper's · milk · "Full Cream" · 12 × 1000 ml
//   "Sabroso Chicken Chapli Kabab 10 Pieces 740g" → Sabroso · kebab · 10 × 74 g
// Used when importing a store catalogue and, on the fly, for products typed in
// by hand. Plain TS with no app imports so scripts can use it too.

import { matchItemType, tokens } from './itemTypes.ts';
import type { ItemType } from './itemTypes.ts';

export type SizeUnit = 'g' | 'ml' | 'pc';

export interface ParsedSize {
  /** Size of one unit in g, ml or pieces. */
  value: number;
  unit: SizeUnit;
  /** Units in the pack (12 for "12 x 250 ml"). */
  pack: number;
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
    .replace(/rs\.?\s*-?\s*\d+/g, ' ') // "Rs. 30" is a price point, not a size
    .replace(/\d+(?:\.\d+)?\s*mg\b/g, ' ') // medicine strength, not a size
    .replace(/\d+(?:\.\d+)?\s*%/g, ' ');

  const metric = (n: string, u: string) => {
    const m = unitOf(u);
    return m ? { value: Number(n) * m.mult, unit: m.unit } : null;
  };

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
  opts: { categoryHint?: string | null; brands?: string[] } = {},
): ParsedProduct {
  const name = tidyName(raw);
  const size = parseSize(name);
  const pp = name.match(/rs\.?\s*-?\s*(\d+)/i);
  const pricePoint = pp ? Number(pp[1]) : null;
  const brand = findBrand(name, opts.brands);
  // The brand is always the leading words (see findBrand).
  const brandWords = brand ? brand.split(' ').length : 0;
  const afterBrand = brand ? name.split(' ').slice(brandWords).join(' ') : name;
  // Match on the whole name so a phrase that starts inside the brand still counts
  // ("Cadbury Dairy Milk" → chocolate), but not one that's only the brand ("Lemon Max").
  // Skip the name's own brand words: "OLPERS" is one token where "Olper's" is two.
  const typeMatch = matchItemType(name, opts.categoryHint, brand ? tokens(name.split(' ').slice(0, brandWords).join(' ')).length : 0);
  const itemType = typeMatch?.type ?? null;

  // Variant: what's left once brand, item words, sizes, prices and packaging are gone.
  const typeWords = new Set(typeMatch?.words ?? []);
  const variantWords = afterBrand
    .replace(/\([^)]*\)/g, ' ')
    .replace(/rs\.?\s*-?\s*\d+/gi, ' ')
    .replace(/\d+(?:\.\d+)?\s*[a-z%']*/gi, ' ')
    .replace(/[|,+\-–/]/g, ' ')
    .split(/\s+/)
    .filter((w) => {
      const t = tokens(w)[0];
      return t && !typeWords.has(t) && !PACKAGING.has(t) && !SMALL_WORDS.has(t) && !/^x$/i.test(w);
    });
  const variant = variantWords.length ? variantWords.join(' ').slice(0, 80) : null;

  const confidence =
    (brand ? 0.3 : 0) + (itemType ? (typeMatch?.confident ? 0.4 : 0.2) : 0) + (size ? 0.3 : 0);
  return { name, brand, itemType, variant, size, pricePoint, confidence: round(confidence) };
}
