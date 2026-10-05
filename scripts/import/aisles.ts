// Store aisle names → our canonical categories (src/lib/categories.ts), and which
// listings we import at all. We compare groceries and household basics: pharmacy,
// cosmetics and non-grocery aisles (electronics, toys, crockery, …) are left out.

/**
 * When these rules last changed in a way that brings back listings they used to leave
 * out. Listings left out before this date are looked at again on the next runs rather
 * than after the usual 60 days (scripts/import/adapters/blink-pages.ts).
 */
export const RULES_CHANGED_AT = '2026-10-06T00:00:00Z';

/** Aisles that are never imported. Checked first. */
const LEAVE_OUT =
  /pharma|medicin|tablet|capsule|vitamin|nutrition|optical|surgical|first aid|sexual|herbal|cosmetic|make ?up|perfume|\battars?\b|eau de|cologne|nail|lipstick|lip ?(gloss|liner|colou?r|tint|stain)|eye ?liner|mascara|jewel|fashion|apparel|clothing|garment|shoes\b|footwear|electronic|appliance|mobile|toy|stationer|stationar|book|crockery|kitchen ?ware|cookware|dinnerware|glassware|utensil|knives|bakeware|party|car |car care|automotive|sporting|sports? (goods|equipment|accessor)|outdoor|pet\b|gift|decor|furniture|grilling|\bgrills?\b|barbecue (tool|accessor|equipment)|learning|school|tobacco|\bvap(e|es|ing)\b|luggage/i;

// Supplements are left out, except baby formula and food supplements ("Formula And
// Supplements", "Baby Food Supplement"); "Herbal & Nutrition" still catches the rest.
const leaveOutName = (n: string) => LEAVE_OUT.test(n) || (/supplement/i.test(n) && !/formula|baby|infant|food/i.test(n));

// Aisles that mix what we import with what we don't. They're decided per product, by name.
const FRAGRANCE = /perfumes?|colognes?|fragrances?/gi;
const PERSONAL = /\bdeos?\b|deod|powder|body ?spray|roll ?on|antiperspirant/i;
const PERFUME_NAME = /perfume|parfum|cologne|eau de|\bedp\b|\bedt\b|\battars?\b/i;
const CAR = /\bcar\b/gi;

interface Mix {
  /** The aisle name without the words for what it mixes in. */
  name: string;
  /** True when this product, by its name, is the part we leave out. */
  excludes: (productName: string) => boolean;
}

function mixOf(name: string): Mix | null {
  if (new RegExp(FRAGRANCE.source, 'i').test(name) && PERSONAL.test(name)) {
    // "Deos & Perfumes", "Powder & Cologne": deodorants and baby powder in, perfumes out.
    return { name: name.replace(FRAGRANCE, ' '), excludes: (p) => PERFUME_NAME.test(p) };
  }
  if (/\bhome\b/i.test(name) && new RegExp(CAR.source, 'i').test(name)) {
    // "Home & Car Fresheners": home air fresheners in, car ones out.
    return { name: name.replace(CAR, ' '), excludes: (p) => new RegExp(CAR.source, 'i').test(p) };
  }
  return null;
}

/** True when any of these aisle names is one we never import (so the aisle needn't be fetched). */
export const leftOut = (names: (string | null | undefined)[]) =>
  names.some((n) => !!n && leaveOutName(mixOf(n)?.name ?? n));

const AISLES: [RegExp, string][] = [
  [/frozen|ice ?cream/i, 'frozen'],
  [/fruit|vegetable|fresh produce/i, 'fruits-veg'],
  [/meat|poultry|chicken|mutton|beef|fish|seafood/i, 'meat'],
  [/dairy|\bmilk\b|\beggs?\b|yogh?urt|cheese|butter/i, 'dairy'],
  [/bakery|bread|rusk|cake|\bbuns?\b/i, 'bakery'],
  [/rice|atta|flour|pulse|\bdaa?l\b|lentil|grain|staple|noodle|pasta|macaroni|vermicelli|spaghetti/i, 'grains'],
  [/\boils?\b|ghee/i, 'cooking-oil'],
  [/spice|masala|\bsalt\b|herb|sauce|ketchup|condiment|dressing|vinegar|pickle|achar/i, 'spices'],
  [/snack|biscuit|chocolate|confection|cand(y|ies)|chips|nimko|dessert/i, 'snacks'],
  [/beverage|drink|juice|water|\btea\b|coffee|soda|squash/i, 'beverages'],
  [/baby|infant|diaper|nappy|wipes|kids|feeding|feeder|nursing/i, 'baby'],
  [/personal care|shampoo|soap|oral|tooth|skin|hair|body|bath|shav|deodorant|\bdeos?\b|deodr|feminine|sanitary|hand ?wash|face ?wash|beauty/i, 'personal-care'],
  [/household|laundry|clean|detergent|home ?care|home essential|tissue|toilet|dish|insect|air fresh|freshener|garbage|foil|cling|bucket|broom|\bmops?\b|wiper|sponge|scrubber|brushes/i, 'household'],
  [/pantry|canned|jam|honey|spread|baking|cooking|sugar|cereal|breakfast|grocery|edible/i, 'pantry'],
];

export interface AisleDecision {
  /** Canonical category id, when we could place it. */
  aisle: string | null;
  include: boolean;
}

/**
 * Decide from the store's aisle names, most specific first ("Shampoo", "Health &
 * Beauty"). The most specific name we recognise wins; a leave-out name anywhere
 * in the path excludes the listing (pharmacy stays out even under "Health & Beauty").
 * `typeAisle` is the category of the item type read from the product name, used
 * when the store's aisle names don't place it. In an aisle that mixes what we import
 * with what we don't ("Deos & Perfumes"), `productName` decides.
 */
export function decideAisle(
  names: (string | null | undefined)[],
  typeAisle: string | null,
  productName = '',
): AisleDecision {
  const raw = names.map((n) => (n || '').trim()).filter(Boolean);
  const mixes = raw.map(mixOf);
  if (mixes.some((m) => m?.excludes(productName))) return { aisle: null, include: false };
  const clean = raw.map((n, i) => mixes[i]?.name.replace(/\s+/g, ' ').trim() || n);
  if (leftOut(clean)) return { aisle: null, include: false };
  for (const n of clean) {
    const hit = AISLES.find(([re]) => re.test(n));
    if (hit) return { aisle: typeAisle && typeAisle !== 'pharmacy' ? typeAisle : hit[1], include: true };
  }
  if (typeAisle && typeAisle !== 'pharmacy') return { aisle: typeAisle, include: true };
  return { aisle: null, include: false };
}
