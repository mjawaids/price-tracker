import { Product, Store, ShoppingList } from '../types';

const STORAGE_KEYS = {
  PRODUCTS: 'price-comparison-products',
  STORES: 'price-comparison-stores',
  SHOPPING_LISTS: 'price-comparison-shopping-lists',
};

export const storage = {
  getProducts: (): Product[] => {
    const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return data ? JSON.parse(data) : [];
  },

  saveProducts: (products: Product[]) => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  },

  getStores: (): Store[] => {
    const data = localStorage.getItem(STORAGE_KEYS.STORES);
    return data ? JSON.parse(data) : [];
  },

  saveStores: (stores: Store[]) => {
    localStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(stores));
  },

  getShoppingLists: (): ShoppingList[] => {
    const data = localStorage.getItem(STORAGE_KEYS.SHOPPING_LISTS);
    return data ? JSON.parse(data) : [];
  },

  saveShoppingLists: (lists: ShoppingList[]) => {
    localStorage.setItem(STORAGE_KEYS.SHOPPING_LISTS, JSON.stringify(lists));
  },
};