/**
 * A store's delivery rule (catalogue stores add an optional minOrder; see
 * src/lib/compare/types.ts). Used by the Where to buy optimizer.
 *   none → in-store / pickup only, no delivery cost
 *   free → always free delivery
 *   over → free above {threshold}, else {fee}
 *   flat → {fee} regardless of order size
 */
export type DeliveryRule =
  | { type: 'none' }
  | { type: 'free' }
  | { type: 'flat'; fee: number }
  | { type: 'over'; threshold: number; fee: number };

/**
 * A quick list ("Groceries", "Pharmacy", …) in the Lists section.
 * Timestamps are ISO strings so rows round-trip through IndexedDB unchanged.
 */
export interface GroceryList {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** One free-text item on a list. Everything except the name is optional. */
export interface ListItem {
  id: string;
  listId: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  note: string | null;
  /** Canonical category id from src/lib/categories.ts, or 'other'. */
  category: string | null;
  done: boolean;
  doneAt: string | null;
  /** Set by "Clear": hidden from the list but kept for suggestions. */
  clearedAt: string | null;
  sortOrder: number;
  /** Product pinned on the item ("Just this time" in Which-product). */
  productId: string | null;
  /** Applied "Where to buy" plan: the store, product and line total for this item. */
  planStoreId?: string | null;
  planProductId?: string | null;
  planPrice?: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
