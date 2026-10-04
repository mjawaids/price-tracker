import { ListItem } from '../../types';
import { CATEGORIES } from '../../lib/categories';

// ── Category helpers ─────────────────────────────────────────────────────────
export const CATEGORY_ORDER = [...CATEGORIES.map((c) => c.id), 'other'];

export function categoryMeta(id: string | null | undefined) {
  const c = CATEGORIES.find((x) => x.id === id);
  return c
    ? { id: c.id, name: c.name, dot: `oklch(0.62 0.13 ${c.hue})`, tint: `oklch(0.93 0.045 ${c.hue})`, ink: `oklch(0.42 0.07 ${c.hue})` }
    : { id: 'other', name: 'Other', dot: 'var(--ink-faint)', tint: 'var(--backdrop)', ink: 'var(--ink-soft)' };
}

/** Open items grouped by aisle, in canonical category order. */
export function groupByCategory(items: ListItem[]) {
  const groups = new Map<string, ListItem[]>();
  for (const i of items) {
    const id = CATEGORY_ORDER.includes(i.category || '') ? (i.category as string) : 'other';
    groups.set(id, [...(groups.get(id) || []), i]);
  }
  return CATEGORY_ORDER.filter((id) => groups.has(id)).map((id) => ({ ...categoryMeta(id), items: groups.get(id)! }));
}

export const buzz = () => {
  try {
    navigator.vibrate?.(10);
  } catch {
    /* not supported */
  }
};

// ── Store sections (an applied "Where to buy" plan) ──────────────────────────
export interface StoreSection<S> {
  store: S | null;
  items: ListItem[];
  /** Sum of the items' plan line totals. */
  subtotal: number;
}

/** Open items grouped by their planned store (biggest first), then "Anywhere". */
export function groupByStore<S extends { id: string }>(items: ListItem[], storeById: (id: string) => S | undefined): StoreSection<S>[] {
  const byStore = new Map<string, ListItem[]>();
  const anywhere: ListItem[] = [];
  for (const i of items) {
    const store = i.planStoreId ? storeById(i.planStoreId) : undefined;
    if (store) byStore.set(store.id, [...(byStore.get(store.id) || []), i]);
    else anywhere.push(i);
  }
  const sections: StoreSection<S>[] = [...byStore.entries()]
    .map(([id, its]) => ({ store: storeById(id)!, items: its, subtotal: its.reduce((a, i) => a + (i.planPrice || 0), 0) }))
    .sort((a, b) => b.subtotal - a.subtotal);
  if (anywhere.length) sections.push({ store: null, items: anywhere, subtotal: 0 });
  return sections;
}
