export interface Product {
  id: string;
  name: string;
  category: string;
  brand?: string;
  unit?: string;
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
}

export interface ShoppingList {
  id: string;
  name: string;
  items: ShoppingListItem[];
  createdAt: Date;
  updatedAt: Date;
}

/** Per-user cart: { [productId]: quantity } */
export type Cart = Record<string, number>;

export type ViewMode = 'dashboard' | 'products' | 'stores' | 'shopping-list' | 'shopping-lists' | 'price-manager' | 'add-product' | 'add-store';
