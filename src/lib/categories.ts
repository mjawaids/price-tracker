// Category + color helpers for the SpendLess design.
// Products store a free-text `category` string; we resolve it to a known
// category (with a hue) when possible, and fall back to a deterministic hue.

export interface Category {
  id: string;
  name: string;
  hue: number;
}

// The 7 canonical categories from the design handoff, with their hues.
export const CATEGORIES: Category[] = [
  { id: 'produce', name: 'Produce', hue: 135 },
  { id: 'dairy', name: 'Dairy & Eggs', hue: 235 },
  { id: 'bakery', name: 'Bakery', hue: 45 },
  { id: 'meat', name: 'Meat', hue: 15 },
  { id: 'pantry', name: 'Pantry', hue: 75 },
  { id: 'household', name: 'Household', hue: 190 },
  { id: 'beverages', name: 'Beverages', hue: 300 },
];

const slug = (s: string) =>
  s.toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Cheap deterministic hash → hue (0–359), used for categories/stores not in the
// canonical list so colors stay stable across renders.
const hashHue = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
};

/** Resolve any free-text product category to a {id,name,hue} descriptor. */
export const resolveCategory = (name: string | undefined): Category => {
  const raw = (name || 'Other').trim();
  const s = slug(raw);
  const exact = CATEGORIES.find(
    (c) => c.id === s || slug(c.name) === s || c.name.toLowerCase() === raw.toLowerCase(),
  );
  if (exact) return exact;
  // Loose contains match (e.g. "Fresh Produce" → Produce)
  const loose = CATEGORIES.find((c) => s.includes(c.id) || c.id.includes(s));
  if (loose) return { ...loose, name: raw };
  return { id: s || 'other', name: raw, hue: hashHue(raw) };
};

/** Stable hue for a store, derived from its id (no schema column needed). */
export const storeHue = (store: { id: string }): number => hashHue(store.id);

// oklch tint helpers for placeholders / category accents.
export const catTint = (hue: number, l = 0.93, c = 0.045) => `oklch(${l} ${c} ${hue})`;
export const catInk = (hue: number) => `oklch(0.42 0.07 ${hue})`;
