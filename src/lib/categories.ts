// Category + color helpers for the SpendLess design.
// Products store a free-text `category` string; we resolve it to a known
// category (with a hue) when possible, and fall back to a deterministic hue.
//
// The active category list is user-managed: it seeds from the canonical set
// below and is persisted to localStorage. `resolveCategory` reads the active
// list so colors/names stay in sync with whatever the user has configured.

export interface Category {
  id: string;
  name: string;
  hue: number;
}

// The 7 canonical categories from the design handoff, with their hues.
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'produce', name: 'Produce', hue: 135 },
  { id: 'dairy', name: 'Dairy & Eggs', hue: 235 },
  { id: 'bakery', name: 'Bakery', hue: 45 },
  { id: 'meat', name: 'Meat', hue: 15 },
  { id: 'pantry', name: 'Pantry', hue: 75 },
  { id: 'household', name: 'Household', hue: 190 },
  { id: 'beverages', name: 'Beverages', hue: 300 },
];

const STORAGE_KEY = 'spendless-categories';

const slug = (s: string) =>
  s.toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Cheap deterministic hash → hue (0–359), used for categories/stores not in the
// canonical list so colors stay stable across renders.
const hashHue = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
};

/** Build a category descriptor from a free-text name. */
export const makeCategory = (name: string): Category => {
  const raw = name.trim();
  return { id: slug(raw) || `cat-${Date.now()}`, name: raw, hue: hashHue(raw) };
};

function loadCategories(): Category[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) {
        return parsed
          .filter((c) => c && typeof c.name === 'string' && c.name.trim())
          .map((c) => ({
            id: c.id || slug(c.name),
            name: c.name,
            hue: typeof c.hue === 'number' ? c.hue : hashHue(c.name),
          }));
      }
    }
  } catch {
    /* ignore malformed storage */
  }
  return DEFAULT_CATEGORIES;
}

// Module-level cache so the pure `resolveCategory` helper (called all over the
// render tree) reflects the user's managed list without threading props.
let activeCategories: Category[] = loadCategories();

/** The current managed category list. */
export const getCategories = (): Category[] => activeCategories;

/** Replace the managed category list and persist it. */
export const setCategories = (list: Category[]): void => {
  activeCategories = list;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* ignore quota / unavailable storage */
  }
};

/** Resolve any free-text product category to a {id,name,hue} descriptor. */
export const resolveCategory = (name: string | undefined): Category => {
  const raw = (name || 'Other').trim();
  const s = slug(raw);
  const list = activeCategories;
  const exact = list.find(
    (c) => c.id === s || slug(c.name) === s || c.name.toLowerCase() === raw.toLowerCase(),
  );
  if (exact) return exact;
  // Loose contains match (e.g. "Fresh Produce" → Produce)
  const loose = list.find((c) => s.includes(c.id) || c.id.includes(s));
  if (loose) return { ...loose, name: raw };
  return { id: s || 'other', name: raw, hue: hashHue(raw) };
};

/** Stable hue for a store, derived from its id (no schema column needed). */
export const storeHue = (store: { id: string }): number => hashHue(store.id);

// oklch tint helpers for placeholders / category accents.
export const catTint = (hue: number, l = 0.93, c = 0.045) => `oklch(${l} ${c} ${hue})`;
export const catInk = (hue: number) => `oklch(0.42 0.07 ${hue})`;
