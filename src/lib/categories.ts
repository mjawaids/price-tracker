// Category + color helpers for the SpendLess design.
// Products store a free-text `category` string; we resolve it to a known
// category (with a hue) when possible, and fall back to a deterministic hue.

export interface Category {
  id: string;
  name: string;
  hue: number;
}

// Daily-household + grocery categories tuned for shopping in Pakistan.
// Order here drives the section order on Browse.
export const CATEGORIES: Category[] = [
  { id: 'fruits-veg', name: 'Fruits & Vegetables', hue: 140 },
  { id: 'meat', name: 'Meat & Poultry', hue: 25 },
  { id: 'dairy', name: 'Dairy & Eggs', hue: 250 },
  { id: 'bakery', name: 'Bakery & Bread', hue: 55 },
  { id: 'grains', name: 'Rice, Atta & Pulses', hue: 85 },
  { id: 'cooking-oil', name: 'Cooking Oil & Ghee', hue: 50 },
  { id: 'spices', name: 'Spices & Condiments', hue: 35 },
  { id: 'pantry', name: 'Pantry & Canned', hue: 100 },
  { id: 'frozen', name: 'Frozen Foods', hue: 195 },
  { id: 'snacks', name: 'Snacks & Biscuits', hue: 350 },
  { id: 'beverages', name: 'Tea, Coffee & Beverages', hue: 300 },
  { id: 'baby', name: 'Baby & Kids', hue: 10 },
  { id: 'pharmacy', name: 'Health & Pharmacy', hue: 215 },
  { id: 'personal-care', name: 'Personal Care', hue: 325 },
  { id: 'household', name: 'Cleaning & Household', hue: 180 },
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
