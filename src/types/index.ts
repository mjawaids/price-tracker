export interface Product {
  id: string;
  name: string;
  category: string;
  brand?: string;
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

export type ViewMode = 'dashboard' | 'products' | 'stores' | 'shopping-list' | 'shopping-lists' | 'price-manager' | 'add-product' | 'add-store';
