export interface Product {
  id: string;
  name: string;
  category: string;
  brand?: string;
  unit?: string;
  imageUrl?: string;
  prices: Price[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Price {
  id: string;
  storeId: string;
  price: number;
  currency: string;
  lastUpdated: Date;
  isAvailable: boolean;
  discountPercentage?: number;
}

/**
 * Per-store delivery rule feeding the cart optimizer.
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

export interface Store {
  id: string;
  name: string;
  type: 'physical' | 'online';
  location?: {
    address: string;
    city: string;
    coordinates: [number, number];
  };
  hasDelivery: boolean;
  deliveryRadius?: number;
  deliveryFee?: number;
  deliveryRule?: DeliveryRule;
  website?: string;
  phone?: string;
  createdAt: Date;
}

export interface ShoppingListItem {
  id: string;
  productId: string;
  quantity: number;
  addedAt: Date;
  priority?: 'low' | 'medium' | 'high';
}

export interface ShoppingList {
  id: string;
  name: string;
  items: ShoppingListItem[];
  createdAt: Date;
  updatedAt: Date;
}

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
  productId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** Per-user cart: { [productId]: quantity } */
export type Cart = Record<string, number>;

export type ViewMode = 'dashboard' | 'products' | 'stores' | 'shopping-list' | 'shopping-lists' | 'price-manager' | 'add-product' | 'add-store';
