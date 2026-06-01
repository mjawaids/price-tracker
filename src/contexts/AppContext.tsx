import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useSettings } from './SettingsContext';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { useFmt } from '../hooks/useFmt';
import { Product, Store, Cart, ShoppingListItem } from '../types';
import { CartLine, priceRange } from '../utils/optimizer';

export type ScreenName =
  | 'browse'
  | 'search'
  | 'detail'
  | 'cart'
  | 'plan'
  | 'profile'
  | 'mproducts'
  | 'mstores'
  | 'mprices';

export type Mode = 'shop' | 'manage';
export type SheetName = 'currency' | 'location' | null;
export type ScreenParams = Record<string, unknown>;

interface StackEntry {
  screen: ScreenName;
  params: ScreenParams;
}

export interface AppApi {
  // identity
  user: { name: string; email: string };
  // data (shared catalogue)
  products: Product[];
  stores: Store[];
  loading: boolean;
  addProduct: ReturnType<typeof useSupabaseData>['addProduct'];
  updateProduct: ReturnType<typeof useSupabaseData>['updateProduct'];
  deleteProduct: ReturnType<typeof useSupabaseData>['deleteProduct'];
  addStore: ReturnType<typeof useSupabaseData>['addStore'];
  updateStore: ReturnType<typeof useSupabaseData>['updateStore'];
  deleteStore: ReturnType<typeof useSupabaseData>['deleteStore'];
  productById: (id: string) => Product | undefined;
  storeById: (id: string) => Store | undefined;
  // preferences
  fmt: (n: number) => string;
  currencyCode: string;
  setCurrencyCode: (code: string) => void;
  location: string | null;
  setLocation: (loc: string | null) => void;
  // cart
  cart: Cart;
  qty: (id: string) => number;
  add: (id: string) => void;
  setQty: (id: string, n: number) => void;
  cartLines: () => CartLine[];
  cartCount: () => number;
  cartTotalGuess: () => number;
  clearCart: () => void;
  // navigation
  screen: ScreenName;
  params: ScreenParams;
  mode: Mode;
  setMode: (m: Mode) => void;
  go: (screen: ScreenName, params?: ScreenParams) => void;
  back: () => void;
  tab: (screen: ScreenName) => void;
  canGoBack: boolean;
  // sheets
  sheet: SheetName;
  openSheet: (s: SheetName) => void;
  // auth
  signOut: () => void;
}

const AppContext = createContext<AppApi | undefined>(undefined);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

const CART_LIST_NAME = 'My Cart';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: authUser, signOut: authSignOut } = useAuth();
  const { settings, updateSettings } = useSettings();
  const fmt = useFmt();
  const data = useSupabaseData();

  const [stack, setStack] = useState<StackEntry[]>([{ screen: 'browse', params: {} }]);
  const [mode, setMode] = useState<Mode>('shop');
  const [sheet, setSheet] = useState<SheetName>(null);
  const [cart, setCart] = useState<Cart>({});

  // Hydrate the cart once from the user's persisted cart list.
  const hydratedRef = useRef(false);
  const cartListIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (hydratedRef.current || data.loading) return;
    if (!data.shoppingLists.length && !authUser) return;
    const list =
      data.shoppingLists.find((l) => l.name === CART_LIST_NAME) || data.shoppingLists[0];
    if (list) {
      cartListIdRef.current = list.id;
      const next: Cart = {};
      (list.items || []).forEach((it: ShoppingListItem) => {
        if (it.productId) next[it.productId] = (next[it.productId] || 0) + (it.quantity || 0);
      });
      setCart(next);
    }
    hydratedRef.current = true;
  }, [data.loading, data.shoppingLists, authUser]);

  // Reset hydration when the user changes (login/logout).
  useEffect(() => {
    hydratedRef.current = false;
    cartListIdRef.current = null;
    setCart({});
  }, [authUser?.id]);

  // Debounced persistence of the cart into a single shopping list row.
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistCart = useCallback(
    (next: Cart) => {
      if (!authUser) return;
      if (persistTimer.current) clearTimeout(persistTimer.current);
      persistTimer.current = setTimeout(async () => {
        const items: ShoppingListItem[] = Object.entries(next)
          .filter(([, q]) => q > 0)
          .map(([productId, quantity]) => ({
            id: productId,
            productId,
            quantity,
            addedAt: new Date(),
          }));
        let listId = cartListIdRef.current;
        if (!listId) {
          const created = await data.createShoppingList(CART_LIST_NAME);
          if (created) listId = created.id;
          cartListIdRef.current = listId;
        }
        if (listId) await data.updateShoppingListItems(listId, items);
      }, 600);
    },
    [authUser, data],
  );

  const mutateCart = useCallback(
    (updater: (c: Cart) => Cart) => {
      setCart((c) => {
        const next = updater(c);
        persistCart(next);
        return next;
      });
    },
    [persistCart],
  );

  const productById = useCallback((id: string) => data.products.find((p) => p.id === id), [data.products]);
  const storeById = useCallback((id: string) => data.stores.find((s) => s.id === id), [data.stores]);

  const api: AppApi = useMemo(() => {
    const cur = stack[stack.length - 1];
    return {
      user: {
        name: (authUser?.user_metadata?.full_name as string) || authUser?.email?.split('@')[0] || 'Guest',
        email: authUser?.email || '',
      },
      products: data.products,
      stores: data.stores,
      loading: data.loading,
      addProduct: data.addProduct,
      updateProduct: data.updateProduct,
      deleteProduct: data.deleteProduct,
      addStore: data.addStore,
      updateStore: data.updateStore,
      deleteStore: data.deleteStore,
      productById,
      storeById,

      fmt,
      currencyCode: settings.currency,
      setCurrencyCode: (code: string) => updateSettings({ currency: code }),
      location: settings.location,
      setLocation: (loc: string | null) => updateSettings({ location: loc }),

      cart,
      qty: (id: string) => cart[id] || 0,
      add: (id: string) => mutateCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 })),
      setQty: (id: string, n: number) =>
        mutateCart((c) => {
          const x = { ...c };
          if (n <= 0) delete x[id];
          else x[id] = n;
          return x;
        }),
      cartLines: () => Object.entries(cart).filter(([, q]) => q > 0).map(([id, qty]) => ({ id, qty })),
      cartCount: () => Object.values(cart).reduce((a, q) => a + q, 0),
      cartTotalGuess: () =>
        Object.entries(cart).reduce((a, [id, q]) => {
          const p = productById(id);
          const r = p ? priceRange(p) : null;
          return a + (r ? r.min * q : 0);
        }, 0),
      clearCart: () => mutateCart(() => ({})),

      screen: cur.screen,
      params: cur.params,
      mode,
      setMode,
      go: (screen: ScreenName, params: ScreenParams = {}) =>
        setStack((s) => [...s, { screen, params }]),
      back: () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)),
      tab: (screen: ScreenName) => setStack([{ screen, params: {} }]),
      canGoBack: stack.length > 1,

      sheet,
      openSheet: (s: SheetName) => setSheet(s),

      signOut: () => {
        setStack([{ screen: 'browse', params: {} }]);
        setMode('shop');
        authSignOut();
      },
    };
  }, [
    stack,
    mode,
    sheet,
    cart,
    data,
    settings.currency,
    settings.location,
    authUser,
    fmt,
    mutateCart,
    productById,
    storeById,
    updateSettings,
    authSignOut,
  ]);

  return <AppContext.Provider value={api}>{children}</AppContext.Provider>;
};
