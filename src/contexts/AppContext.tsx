import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useSettings } from './SettingsContext';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { useLists } from './ListsContext';
import { useFmt } from '../hooks/useFmt';
import { Product, Store, Cart, ShoppingListItem } from '../types';
import { CartLine, priceRange } from '../utils/optimizer';

export type ScreenName =
  | 'lists'
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
/** Top-level app sections: quick Lists (default) and price Compare. */
export type Section = 'lists' | 'compare' | 'profile';

const sectionOf = (screen: ScreenName): Section =>
  screen === 'lists' ? 'lists' : screen === 'profile' ? 'profile' : 'compare';
export type SheetName = 'currency' | 'location' | null;
export type ScreenParams = Record<string, unknown>;

interface StackEntry {
  screen: ScreenName;
  params: ScreenParams;
}

export interface AppApi {
  // identity
  user: { name: string; email: string; avatarUrl?: string };
  // data (shared catalogue)
  products: Product[];
  stores: Store[];
  loading: boolean;
  addProduct: ReturnType<typeof useSupabaseData>['addProduct'];
  updateProduct: ReturnType<typeof useSupabaseData>['updateProduct'];
  deleteProduct: ReturnType<typeof useSupabaseData>['deleteProduct'];
  uploadProductImage: ReturnType<typeof useSupabaseData>['uploadProductImage'];
  deleteProductImage: ReturnType<typeof useSupabaseData>['deleteProductImage'];
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
  section: Section;
  openSection: (s: Section) => void;
  go: (screen: ScreenName, params?: ScreenParams) => void;
  back: () => void;
  tab: (screen: ScreenName, params?: ScreenParams) => void;
  canGoBack: boolean;
  // sheets
  sheet: SheetName;
  openSheet: (s: SheetName) => void;
  // auth
  signOut: () => Promise<void>;
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

  const { clearLocalData: clearLocalLists } = useLists();
  const [stack, setStack] = useState<StackEntry[]>([{ screen: 'lists', params: {} }]);
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

  // Cart writes run one at a time (persistQueueRef), so only one "My Cart" row is
  // ever created and an older cart can't overwrite a newer one. persistSeqRef
  // lets a queued write skip itself once a newer cart is waiting behind it, and
  // persistGenRef drops writes queued before the user changed.
  const persistQueueRef = useRef<Promise<void>>(Promise.resolve());
  const persistSeqRef = useRef(0);
  const persistGenRef = useRef(0);

  // Reset hydration when the user changes (login/logout).
  useEffect(() => {
    hydratedRef.current = false;
    cartListIdRef.current = null;
    persistGenRef.current += 1;
    setCart({});
  }, [authUser?.id]);

  // Debounced persistence of the cart into a single shopping list row.
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistCart = useCallback(
    (next: Cart) => {
      if (!authUser) return;
      if (persistTimer.current) clearTimeout(persistTimer.current);
      persistTimer.current = setTimeout(() => {
        const items: ShoppingListItem[] = Object.entries(next)
          .filter(([, q]) => q > 0)
          .map(([productId, quantity]) => ({
            id: productId,
            productId,
            quantity,
            addedAt: new Date(),
          }));
        const seq = ++persistSeqRef.current;
        const gen = persistGenRef.current;
        const isCurrent = () => seq === persistSeqRef.current && gen === persistGenRef.current;
        persistQueueRef.current = persistQueueRef.current
          .then(async () => {
            if (!isCurrent()) return; // a newer cart is queued; it will write
            let listId = cartListIdRef.current;
            if (!listId) {
              const created = await data.createShoppingList(CART_LIST_NAME);
              if (gen !== persistGenRef.current) return; // user changed meanwhile
              listId = created?.id ?? null;
              cartListIdRef.current = listId;
            }
            if (listId && gen === persistGenRef.current) await data.updateShoppingListItems(listId, items);
          })
          .catch((error) => console.error('Error saving cart:', error));
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
        // Custom upload takes precedence, then the Google-provided photo, then initials.
        avatarUrl:
          (authUser?.user_metadata?.avatar_url as string) ||
          (authUser?.user_metadata?.picture as string) ||
          undefined,
      },
      products: data.products,
      stores: data.stores,
      loading: data.loading,
      addProduct: data.addProduct,
      updateProduct: data.updateProduct,
      deleteProduct: data.deleteProduct,
      uploadProductImage: data.uploadProductImage,
      deleteProductImage: data.deleteProductImage,
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
      section: sectionOf(cur.screen),
      openSection: (s: Section) => {
        if (s === 'compare') {
          setMode('shop');
          setStack([{ screen: 'browse', params: {} }]);
        } else setStack([{ screen: s, params: {} }]);
      },
      go: (screen: ScreenName, params: ScreenParams = {}) =>
        setStack((s) => [...s, { screen, params }]),
      back: () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)),
      tab: (screen: ScreenName, params: ScreenParams = {}) => setStack([{ screen, params }]),
      canGoBack: stack.length > 1,

      sheet,
      openSheet: (s: SheetName) => setSheet(s),

      signOut: async () => {
        setStack([{ screen: 'lists', params: {} }]);
        setMode('shop');
        await clearLocalLists();
        await authSignOut();
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
    clearLocalLists,
  ]);

  return <AppContext.Provider value={api}>{children}</AppContext.Provider>;
};
