export interface Product {
  id: string;
  name: string;
  category: string;
  brand?: string;
  variants: ProductVariant[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductVariant {
  id: string;
  name: string;
  specifications: Record<string, string>;
  prices: Price[];
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
  website?: string;
  phone?: string;
  createdAt: Date;
}

export interface ShoppingListItem {
  id: string;
  productId: string;
  variantId: string;
  quantity: number;
  addedAt: Date;
  priority: 'low' | 'medium' | 'high';
}

export interface ShoppingList {
  id: string;
  name: string;
  items: ShoppingListItem[];
  createdAt: Date;
  updatedAt: Date;
}

export type ViewMode = 'dashboard' | 'products' | 'stores' | 'shopping-list' | 'add-product' | 'add-store';