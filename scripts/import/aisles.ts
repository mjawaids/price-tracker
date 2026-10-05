// Store aisle names → our canonical categories (src/lib/categories.ts), and which
// listings we import at all. We compare groceries and household basics: pharmacy,
// cosmetics and non-grocery aisles (electronics, toys, crockery, …) are left out.

/** Aisles that are never imported. Checked first. */
const LEAVE_OUT =
  /pharma|medicin|tablet|capsule|vitamin|(?<!food )supplement|nutrition|optical|surgical|first aid|sexual|herbal|cosmetic|make ?up|perfume|\battars?\b|eau de|cologne|nail|lip(stick)?|eye ?liner|mascara|jewel|fashion|apparel|clothing|garment|shoes\b|footwear|electronic|appliance|mobile|toy|stationer|stationar|book|crockery|kitchen ?ware|cookware|dinnerware|glassware|utensil|knives|bakeware|party|car |car care|automotive|sporting|sports? (goods|equipment|accessor)|outdoor|pet\b|gift|decor|furniture|grilling|\bgrills?\b|barbecue (tool|accessor|equipment)|learning|school|tobacco|\bvap(e|es|ing)\b|luggage/i;

/** True when any of these aisle names is one we never import (so the aisle needn't be fetched). */
export const leftOut = (names: (string | null | undefined)[]) => names.some((n) => !!n && LEAVE_OUT.test(n));

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
  [/baby|infant|diaper|nappy|wipes|kids/i, 'baby'],
  [/personal care|shampoo|soap|oral|tooth|skin|hair|body|bath|shav|deodorant|feminine|sanitary|hand ?wash|face ?wash|beauty/i, 'personal-care'],
  [/household|laundry|clean|detergent|home ?care|tissue|toilet|dish|insect|air fresh|garbage|foil|cling/i, 'household'],
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
 * when the store's aisle names don't place it.
 */
export function decideAisle(names: (string | null | undefined)[], typeAisle: string | null): AisleDecision {
  const clean = names.map((n) => (n || '').trim()).filter(Boolean);
  if (leftOut(clean)) return { aisle: null, include: false };
  for (const n of clean) {
    const hit = AISLES.find(([re]) => re.test(n));
    if (hit) return { aisle: typeAisle && typeAisle !== 'pharmacy' ? typeAisle : hit[1], include: true };
  }
  if (typeAisle && typeAisle !== 'pharmacy') return { aisle: typeAisle, include: true };
  return { aisle: null, include: false };
}
