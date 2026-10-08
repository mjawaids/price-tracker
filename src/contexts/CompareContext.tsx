import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { useLists } from './ListsContext';
import { useSettings } from './SettingsContext';
import { ListItem } from '../types';
import { supabase } from '../lib/supabase';
import { PRODUCT_IMAGES_BUCKET, storagePathFromUrl } from '../lib/storage';
import { normalizeName } from '../lib/groceryDictionary';
import * as api from '../lib/compare/api';
import { CatalogSnapshot, deleteSnapshot, readSnapshot, writeSnapshot } from '../lib/compare/cache';
import { buildContext, resolveItem, ResolvedItem, ResolveContext } from '../lib/compare/resolve';
import { buildPlans, PlanSet } from '../lib/compare/optimizer';
import { BranchSuggestion, CatalogProduct, CatalogStore, CurrentPrice, ItemPreference, PreferenceMode, Region } from '../lib/compare/types';
import { cleanPlace } from '../lib/compare/areas';
import { dropFromQueue, pushQueue, readQueue, clearQueue } from '../lib/compare/priceQueue';
import { clearChecks } from '../lib/compare/checkState';
import { ITEM_TYPE_BY_ID } from '../lib/compare/itemTypes';
import { CATEGORIES, resolveCategory } from '../lib/categories';
import { trackUserAction } from '../utils/analytics';
import { formatPrice } from '../utils/currency';

/** The list the old Compare cart becomes (one time, on update). */
export const CART_LIST_NAME = 'From Compare cart';
const FULL_REFRESH_MS = 24 * 60 * 60 * 1000;
const STALE_MS = 10 * 60 * 1000;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const cartKey = (userId: string) => `spendless-cart-migrated:${userId}`;
const { pairKey } = api;

export interface PlanResult {
  resolved: ResolvedItem[];
  set: PlanSet;
  /** Stores the plan could use. */
  storeIds: string[];
}

interface CompareApi {
  /** Something to show (from the device or the network). */
  ready: boolean;
  refreshing: boolean;
  /** The last network refresh failed (cached data may still be shown). */
  failed: boolean;
  online: boolean;
  syncedAt: string | null;
  regions: Region[];
  region: Region | null;
  /** The user has picked a city (or "another city"). */
  regionChosen: boolean;
  /** Shared prices are on in the user's city. */
  isLive: boolean;
  /** Money in the city's currency (prices are stored in it), else the user's. */
  fmt: (n: number) => string;
  currency: string;
  setRegion: (id: string | null) => void;
  stores: CatalogStore[];
  products: CatalogProduct[];
  storeById: (id: string) => CatalogStore | undefined;
  productById: (id: string) => CatalogProduct | undefined;
  /** Effective prices: the shared price, or the user's own newer report. */
  pricesFor: (productId: string) => CurrentPrice[];
  priceAt: (storeId: string, productId: string) => CurrentPrice | undefined;
  /** Explicit store picks (empty = the default set, see `defaultStoreIds`). */
  myStoreIds: string[];
  /**
   * What Where to buy compares when nothing is picked: the city's online stores and your
   * own stores (shared in-store branches only once picked, or once your own shop moved
   * into one).
   */
  defaultStoreIds: string[];
  /** The stores Where to buy (and "your stores" prices) use: the picks, else the default set. */
  consideredStores: CatalogStore[];
  setMyStores: (ids: string[]) => Promise<boolean>;
  preferences: Map<string, ItemPreference>;
  setUsual: (itemKey: string, mode: PreferenceMode, refProductId: string, productIds?: string[]) => Promise<boolean>;
  clearUsual: (itemKey: string) => Promise<boolean>;
  resolveContext: ResolveContext;
  planFor: (items: ListItem[]) => PlanResult;
  recordPlan: (p: { listId: string; total: number; baselineTotal: number | null; savings: number; storeCount: number; itemCount: number }) => void;
  savedThisMonth: number;
  plansThisMonth: number;
  /** Prices this user added in the last 30 days (a shop's moved prices count once). */
  recentReports: number;
  /** Shops the user suggested as shared ones, newest first. */
  suggestions: BranchSuggestion[];
  /** The suggestion for one of the user's shops, if any. */
  suggestionFor: (storeId: string) => BranchSuggestion | undefined;
  /** Where a shop that became shared went (the shared shop's id), else null. */
  movedTo: (storeId: string) => string | null;
  /**
   * Suggest one of the user's own in-store shops as a shared one (sets the shop's city
   * first when it has none). `knownChain`: the name was picked, not typed (analytics).
   */
  suggestBranch: (storeId: string, chain: string, area: string, knownChain: boolean) => Promise<SuggestResult>;
  /** Withdraw a suggestion still waiting ('decided': it was decided meanwhile; refreshed). */
  withdrawSuggestion: (id: string) => Promise<'ok' | 'decided' | 'error'>;
  addStore: (s: api.StoreInput) => Promise<CatalogStore | null>;
  updateStore: (id: string, s: api.StoreInput) => Promise<CatalogStore | null>;
  deleteStore: (id: string) => Promise<boolean>;
  addProduct: (p: api.ProductInput) => Promise<CatalogProduct | null>;
  updateProduct: (id: string, p: api.ProductInput) => Promise<CatalogProduct | null>;
  deleteProduct: (id: string) => Promise<boolean>;
  uploadProductImage: (productId: string, file: File) => Promise<string | null>;
  /** Delete an image this user uploaded (anything outside their folder is left alone). */
  removeProductImage: (url: string | null | undefined) => Promise<void>;
  /**
   * Add a price (or "out of stock", or with source `dispute` "this price is wrong").
   * `pending`: held for a check, only the user sees it for now; `flagged`: a dispute
   * that made the shared price disputed; null: not saved.
   */
  reportPrice: (r: {
    storeId: string;
    productId: string;
    price: number | null;
    isAvailable?: boolean;
    source?: api.ReportSource;
  }) => Promise<'accepted' | 'pending' | 'flagged' | null>;
  /** Prices at one store: shared, with the user's own newer reports on top. */
  pricesAtStore: (storeId: string) => CurrentPrice[];
  /** The user's own reports kept on this device (last 30 days, no "wrong price" ones, newest first). */
  ownReports: CurrentPrice[];
  /** The user's own reports at one store (last 30 days, newest first). */
  ownReportsAt: (storeId: string) => CurrentPrice[];
  /**
   * Save a receipt's prices at one store in one transaction (all or nothing): rows
   * name a product, or a new private product (a medicine; the user's own product with
   * the same name is reused). A refused save leaves no new products behind.
   */
  reportPrices: (storeId: string, rows: api.ReceiptPrice[], observedAt: string | null) => Promise<ReceiptSaveResult>;
  /** Undo a receipt, or remove one of your prices: delete the reports and re-read those prices. */
  retractReports: (storeId: string, ids: string[], productIds: string[], reason?: 'receipt' | 'removed') => Promise<boolean>;
  /**
   * Price checks while shopping: the price shown was right (`confirm`), different or
   * not there (`trip`). Sent at once when online, else kept on this device and sent
   * when the app is back online. null: refused or failed.
   */
  checkPrices: (rows: PriceCheck[], from: 'tick' | 'summary') => Promise<CheckResult | null>;
  refresh: (force?: boolean) => Promise<void>;
  /** Set when the old Compare cart was turned into a list on this device. */
  convertedCart: { listId: string; count: number } | null;
  /** Sign-out helper: delete this user's cached catalogue. */
  clearLocalData: () => Promise<void>;
}

/** One answer to "Was it Rs 210?" for a store and product (`price` null: not there). */
export interface PriceCheck {
  storeId: string;
  productId: string;
  price: number | null;
  isAvailable: boolean;
  source: 'confirm' | 'trip';
}
/** `held`: kept just for the user for now (far from the usual price); `queued`: waiting on this device. */
export interface CheckResult {
  saved: number;
  held: number;
  queued: number;
}

/** ok · offline · limit (too many waiting) · taken (already suggested) · denied (not a shop that can be shared) · invalid (the name) · error */
export type SuggestResult = 'ok' | 'offline' | 'limit' | 'taken' | 'denied' | 'invalid' | 'error';

export type ReceiptSaveResult =
  /** `productIds`: the product each row was saved to, in order (given, reused or new). */
  | { ok: true; ids: string[]; productIds: string[]; accepted: number; pending: number }
  /** offline · rate_limit (500 a day) · denied (refused by a policy, e.g. a date over 90 days) · error */
  | { ok: false; reason: 'offline' | 'rate_limit' | 'denied' | 'error' };

const newestFirst = (a: CurrentPrice, b: CurrentPrice) => Date.parse(b.observedAt) - Date.parse(a.observedAt);

/** A product's list aisle (a canonical category id), when we know it. */
const aisleOf = (p: CatalogProduct): string | null => {
  const fromType = p.itemType ? ITEM_TYPE_BY_ID.get(p.itemType)?.category : undefined;
  if (fromType) return fromType;
  const c = resolveCategory(p.category ?? undefined);
  return CATEGORIES.some((x) => x.id === c.id) ? c.id : null;
};

const CompareContext = createContext<CompareApi | undefined>(undefined);

export const useCompare = () => {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error('useCompare must be used within CompareProvider');
  return ctx;
};

const emptySnapshot = (): CatalogSnapshot => ({
  regions: [], stores: [], products: [], prices: [], ownReports: [], preferences: [], myStores: [], plans: [], suggestions: [],
  regionId: null, cursor: null, fullAt: 0, syncedAt: null,
});

/** Run a network write; log (without user content) and return null on failure. */
async function guard<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    console.error(`${label} failed:`, error instanceof Error ? error.message : error);
    return null;
  }
}

const track = (action: string, details?: Record<string, unknown>) => {
  if (typeof window !== 'undefined' && typeof window.gtag !== 'undefined') trackUserAction(action, details);
};

export const CompareProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const lists = useLists();
  const { settings, updateSettings } = useSettings();
  const regionId = settings.regionId;

  const [snap, setSnap] = useState<CatalogSnapshot>(emptySnapshot);
  const [ready, setReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [convertedCart, setConvertedCart] = useState<{ listId: string; count: number } | null>(null);

  const snapRef = useRef(snap);
  snapRef.current = snap;
  const busy = useRef(false);
  /** A refresh asked for while one was running (forced if any request was). */
  const pending = useRef<{ force: boolean } | null>(null);
  const lastRefresh = useRef(0);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  /** Update state and the device copy together. */
  const commit = useCallback(
    (next: CatalogSnapshot) => {
      setSnap(next);
      if (userId) void writeSnapshot(userId, next);
    },
    [userId],
  );

  // ── Load from the device, then refresh from the network ────────────────────
  const refresh = useCallback(
    async (force = false) => {
      if (!userId) return;
      if (busy.current) {
        // Never drop it: the running one may be for an old city (or user).
        pending.current = { force: (pending.current?.force ?? false) || force };
        return;
      }
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      busy.current = true;
      setRefreshing(true);
      try {
        const cur = snapRef.current;
        const regions = await api.fetchRegions();
        // One-time: map the old free-text location ("Karachi, PK") to a city.
        let region = settingsRef.current.regionId;
        if (!region && settingsRef.current.location) {
          const loc = settingsRef.current.location.toLowerCase();
          const hit = regions.find((r) => loc.startsWith(r.name.toLowerCase()));
          if (hit) {
            region = hit.id;
            updateSettings({ regionId: hit.id });
          }
        }
        const stores = await api.fetchStores(userId, region && regions.some((r) => r.id === region) ? region : null);
        const storeIds = stores.map((s) => s.id);
        const known = new Set(cur.stores.map((s) => s.id));
        const full =
          force ||
          cur.regionId !== region ||
          Date.now() - cur.fullAt > FULL_REFRESH_MS ||
          storeIds.some((id) => !known.has(id));
        const [priced, own, ownReports, preferences, myStores, plans, suggestions] = await Promise.all([
          api.fetchPrices(storeIds, full ? null : cur.cursor),
          api.fetchOwnProducts(userId),
          api.fetchOwnReports(userId),
          api.fetchPreferences(),
          api.fetchMyStores(),
          api.fetchPlansThisMonth(),
          // Optional: without it the rest still loads (the last known ones are kept).
          api.fetchSuggestions().catch((error) => {
            console.error('Loading shop suggestions failed:', error instanceof Error ? error.message : error);
            return cur.suggestions;
          }),
        ]);

        const productMap = new Map<string, CatalogProduct>();
        // Own products are always re-read in full: one missing now was deleted
        // (maybe on another device), and its prices went with it.
        const ownIds = new Set(own.map((p) => p.id));
        if (!full) for (const p of cur.products) if (!(p.ownerId === userId && !ownIds.has(p.id))) productMap.set(p.id, p);
        for (const p of [...priced.products, ...own]) productMap.set(p.id, p);
        // Products referenced by usuals or pinned on list items, if not loaded yet.
        const wanted = new Set<string>();
        for (const pref of preferences) {
          if (pref.refProductId) wanted.add(pref.refProductId);
          pref.productIds.forEach((id) => wanted.add(id));
        }
        for (const l of lists.lists) for (const i of lists.itemsForList(l.id)) if (i.productId) wanted.add(i.productId);
        const missing = [...wanted].filter((id) => !productMap.has(id));
        if (missing.length) for (const p of await api.fetchProductsById(missing)) productMap.set(p.id, p);

        // Delta: changed rows replace old ones and tombstones remove theirs.
        const keep = new Set(storeIds);
        const priceMap = new Map<string, CurrentPrice>();
        if (!full) for (const p of cur.prices) if (keep.has(p.storeId)) priceMap.set(pairKey(p.storeId, p.productId), p);
        for (const p of priced.prices) priceMap.set(pairKey(p.storeId, p.productId), p);
        for (const k of priced.removed) priceMap.delete(k);
        const prices = [...priceMap.values()].filter((p) => productMap.has(p.productId));

        // Stale by now (another city chosen, or another user signed in): drop it;
        // the queued refresh loads the right data.
        if (userIdRef.current !== userId || settingsRef.current.regionId !== region) {
          pending.current = { force: true };
          return;
        }

        commit({
          regions,
          stores,
          products: [...productMap.values()],
          prices,
          ownReports,
          preferences,
          myStores,
          plans,
          suggestions,
          regionId: region,
          cursor: full ? priced.cursor : priced.cursor ?? cur.cursor,
          fullAt: full ? Date.now() : cur.fullAt,
          syncedAt: new Date().toISOString(),
        });
        setFailed(false);
        lastRefresh.current = Date.now();
      } catch (error) {
        console.error('Compare refresh failed:', error instanceof Error ? error.message : error);
        setFailed(true);
      } finally {
        busy.current = false;
        setRefreshing(false);
        setReady(true);
        const next = pending.current;
        pending.current = null;
        if (next) void refreshRef.current(next.force);
      }
    },
    [userId, commit, updateSettings, lists],
  );
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    setSnap(emptySnapshot());
    setReady(false);
    setFailed(false);
    setConvertedCart(null);
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const cached = await readSnapshot(userId);
      if (cancelled) return;
      if (cached) {
        // A snapshot saved by an older version may lack newer fields.
        setSnap({ ...emptySnapshot(), ...cached });
        setReady(true);
      }
      await refreshRef.current();
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // A new city: reload everything for it.
  const firstRegion = useRef(true);
  useEffect(() => {
    if (firstRegion.current) {
      firstRegion.current = false;
      return;
    }
    void refreshRef.current(true);
  }, [regionId]);

  useEffect(() => {
    const on = () => {
      setOnline(true);
      void refreshRef.current();
    };
    const off = () => setOnline(false);
    const visible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastRefresh.current > STALE_MS) void refreshRef.current();
    };
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    document.addEventListener('visibilitychange', visible);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      document.removeEventListener('visibilitychange', visible);
    };
  }, []);

  // ── One-time: the old Compare cart becomes a list ───────────────────────────
  const converting = useRef(false);
  useEffect(() => {
    if (!userId || !ready || !lists.ready || lists.syncStatus !== 'synced' || converting.current) return;
    let flag: string | null = null;
    try {
      flag = localStorage.getItem(cartKey(userId));
    } catch {
      return;
    }
    if (flag) return;
    converting.current = true;
    (async () => {
      try {
        const done = (value: string) => localStorage.setItem(cartKey(userId), value);
        // Another device may have converted it already (the list syncs).
        if (lists.lists.some((l) => l.name === CART_LIST_NAME)) return done('exists');
        const cart = await api.fetchLegacyCart();
        if (!cart.length) return done('empty');
        const known = new Map(snapRef.current.products.map((p) => [p.id, p]));
        const missing = cart.map((c) => c.productId).filter((id) => !known.has(id));
        if (missing.length) for (const p of await api.fetchProductsById(missing)) known.set(p.id, p);
        const items = cart
          .filter((c) => known.has(c.productId))
          .map((c) => {
            const p = known.get(c.productId)!;
            return { name: p.name, quantity: c.quantity, productId: p.id, category: aisleOf(p) };
          });
        if (!items.length) return done('empty');
        const list = lists.createListWithItems(CART_LIST_NAME, items);
        done(`converted:${list.id}:${items.length}`);
        setConvertedCart({ listId: list.id, count: items.length });
        track('cart_converted', { item_count: items.length });
      } catch (error) {
        console.error('Cart conversion failed (will retry):', error instanceof Error ? error.message : error);
        converting.current = false;
      }
    })();
  }, [userId, ready, lists]);

  // ── Derived data ────────────────────────────────────────────────────────────
  const region = useMemo(() => snap.regions.find((r) => r.id === regionId) ?? null, [snap.regions, regionId]);
  const storeMap = useMemo(() => new Map(snap.stores.map((s) => [s.id, s])), [snap.stores]);
  const productMap = useMemo(() => new Map(snap.products.map((p) => [p.id, p])), [snap.products]);

  /** Shared prices with the user's own newer report on top. A closed store (e.g. a shop that moved into a shared one) has none. */
  const effective = useMemo(() => {
    const m = new Map<string, CurrentPrice>();
    const open = (id: string) => storeMap.get(id)?.status !== 'closed';
    for (const p of snap.prices) if (open(p.storeId)) m.set(pairKey(p.storeId, p.productId), p);
    // Own reports come newest first: the first one per pair wins if it's newer.
    for (const r of snap.ownReports) {
      if (!storeMap.has(r.storeId) || !open(r.storeId)) continue;
      const k = pairKey(r.storeId, r.productId);
      const cur = m.get(k);
      if (cur?.mine) continue;
      if (!cur || r.observedAt >= cur.observedAt) m.set(k, r);
    }
    return m;
  }, [snap.prices, snap.ownReports, storeMap]);

  const ownByStore = useMemo(() => {
    const m = new Map<string, CurrentPrice[]>();
    for (const r of snap.ownReports) m.set(r.storeId, [...(m.get(r.storeId) || []), r]);
    return m;
  }, [snap.ownReports]);

  const byStore = useMemo(() => {
    const m = new Map<string, CurrentPrice[]>();
    for (const p of effective.values()) m.set(p.storeId, [...(m.get(p.storeId) || []), p]);
    return m;
  }, [effective]);

  const byProduct = useMemo(() => {
    const m = new Map<string, CurrentPrice[]>();
    for (const p of effective.values()) m.set(p.productId, [...(m.get(p.productId) || []), p]);
    return m;
  }, [effective]);

  // Shops that became shared: the user's own shop → the shared one it moved into.
  const moved = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of snap.suggestions) {
      if (s.status === 'promoted' && s.storeId && s.promotedStoreId && storeMap.get(s.promotedStoreId)?.status === 'active') m.set(s.storeId, s.promotedStoreId);
    }
    return m;
  }, [snap.suggestions, storeMap]);
  const movedInto = useMemo(
    () => new Set(snap.suggestions.filter((s) => s.status === 'promoted' && s.promotedStoreId).map((s) => s.promotedStoreId as string)),
    [snap.suggestions],
  );

  // Shared in-store branches count only once the user picks them ("the Imtiaz near me"):
  // a plan shouldn't send anyone across the city. Their prices still show elsewhere. A
  // shared shop the user's own shop moved into counts, as their own shop did.
  const defaultStores = useMemo(
    () => snap.stores.filter((s) => s.status === 'active' && (!(s.ownerId == null && s.kind === 'physical') || movedInto.has(s.id))),
    [snap.stores, movedInto],
  );
  const consideredStores = useMemo(() => {
    if (snap.myStores.length) {
      const picked = snap.stores.filter((s) => s.status === 'active' && snap.myStores.includes(s.id));
      if (picked.length) return picked;
    }
    return defaultStores;
  }, [snap.stores, snap.myStores, defaultStores]);
  const defaultStoreIds = useMemo(() => defaultStores.map((s) => s.id), [defaultStores]);

  const preferences = useMemo(() => new Map(snap.preferences.map((p) => [p.itemKey, p])), [snap.preferences]);

  /** Item type → the product the user last reported (their "last buy"). */
  const lastBought = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of snap.ownReports) {
      const p = productMap.get(r.productId);
      if (p?.itemType && !m.has(p.itemType)) m.set(p.itemType, p.id);
    }
    return m;
  }, [snap.ownReports, productMap]);

  const resolveContext = useMemo(
    () =>
      buildContext({
        products: snap.products,
        prices: [...effective.values()],
        storeIds: new Set(consideredStores.map((s) => s.id)),
        preferences: snap.preferences,
        lastBought,
      }),
    [snap.products, effective, consideredStores, snap.preferences, lastBought],
  );

  const planFor = useCallback(
    (items: ListItem[]): PlanResult => {
      const resolved = items.map((i) =>
        resolveItem(resolveContext, { id: i.id, name: i.name, quantity: i.quantity, unit: i.unit, productId: i.productId }),
      );
      const optStores = consideredStores.map((s) => ({ id: s.id, rule: s.deliveryRule, kind: s.kind }));
      const set = buildPlans(
        resolved.map((r) => ({ key: r.item.id, options: r.options })),
        optStores,
      );
      return { resolved, set, storeIds: optStores.map((s) => s.id) };
    },
    [resolveContext, consideredStores],
  );

  const savedThisMonth = useMemo(() => snap.plans.reduce((a, p) => a + p.savings, 0), [snap.plans]);

  // ── Writes ──────────────────────────────────────────────────────────────────
  const setMyStores = useCallback(
    async (ids: string[]) => {
      if (!userId) return false;
      const prev = snapRef.current.myStores;
      const ok = await guard('Saving your stores', () => api.saveMyStores(userId, ids, prev));
      if (ok === null) return false;
      commit({ ...snapRef.current, myStores: ids });
      return true;
    },
    [userId, commit],
  );

  const setUsual = useCallback(
    async (itemKey: string, mode: PreferenceMode, refProductId: string, productIds: string[] = [refProductId]) => {
      if (!userId) return false;
      const key = normalizeName(itemKey);
      const ok = await guard('Saving your usual', () => api.upsertPreference(userId, { itemKey: key, mode, refProductId, productIds }));
      if (ok === null) return false;
      const pref: ItemPreference = { itemKey: key, mode, refProductId, productIds, updatedAt: new Date().toISOString() };
      commit({ ...snapRef.current, preferences: [...snapRef.current.preferences.filter((p) => p.itemKey !== key), pref] });
      return true;
    },
    [userId, commit],
  );

  const clearUsual = useCallback(
    async (itemKey: string) => {
      const key = normalizeName(itemKey);
      const ok = await guard('Clearing your usual', () => api.deletePreference(key));
      if (ok === null) return false;
      commit({ ...snapRef.current, preferences: snapRef.current.preferences.filter((p) => p.itemKey !== key) });
      return true;
    },
    [commit],
  );

  const recordPlan = useCallback<CompareApi['recordPlan']>(
    (p) => {
      track('plan_applied', { store_count: p.storeCount, item_count: p.itemCount });
      void guard('Saving the plan', async () => {
        const rec = await api.insertPlan({ ...p, regionId: settingsRef.current.regionId, currency: region?.currency ?? settingsRef.current.currency });
        commit({ ...snapRef.current, plans: [rec, ...snapRef.current.plans] });
      });
    },
    [commit, region],
  );

  const addStore = useCallback(
    async (s: api.StoreInput) => {
      const row = await guard('Adding a store', () => api.insertStore(s));
      if (row) commit({ ...snapRef.current, stores: [row, ...snapRef.current.stores] });
      return row;
    },
    [commit],
  );

  const updateStore = useCallback(
    async (id: string, s: api.StoreInput) => {
      const row = await guard('Saving a store', () => api.updateStoreRow(id, s));
      if (row) commit({ ...snapRef.current, stores: snapRef.current.stores.map((x) => (x.id === id ? row : x)) });
      return row;
    },
    [commit],
  );

  const deleteStore = useCallback(
    async (id: string) => {
      const ok = await guard('Deleting a store', () => api.deleteStoreRow(id));
      if (ok === null) return false;
      const cur = snapRef.current;
      commit({
        ...cur,
        stores: cur.stores.filter((s) => s.id !== id),
        prices: cur.prices.filter((p) => p.storeId !== id),
        ownReports: cur.ownReports.filter((p) => p.storeId !== id),
        myStores: cur.myStores.filter((s) => s !== id),
        // A waiting suggestion goes with its shop; a decided one keeps where it went.
        suggestions: cur.suggestions
          .filter((s) => !(s.storeId === id && s.status === 'open'))
          .map((s) => (s.storeId === id ? { ...s, storeId: null } : s)),
      });
      return true;
    },
    [commit],
  );

  const addProduct = useCallback(
    async (p: api.ProductInput) => {
      const row = await guard('Adding a product', () => api.insertProduct(p));
      if (row) commit({ ...snapRef.current, products: [row, ...snapRef.current.products] });
      return row;
    },
    [commit],
  );

  const updateProduct = useCallback(
    async (id: string, p: api.ProductInput) => {
      const row = await guard('Saving a product', () => api.updateProductRow(id, p));
      if (row) commit({ ...snapRef.current, products: snapRef.current.products.map((x) => (x.id === id ? row : x)) });
      return row;
    },
    [commit],
  );

  const removeProductImage = useCallback(
    async (url: string | null | undefined) => {
      const path = storagePathFromUrl(url ?? undefined, PRODUCT_IMAGES_BUCKET);
      if (!userId || !path || !path.startsWith(`${userId}/`)) return;
      const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([path]);
      if (error) console.error('Product image delete failed:', error.message);
    },
    [userId],
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      const image = snapRef.current.products.find((p) => p.id === id)?.imageUrl;
      const ok = await guard('Deleting a product', () => api.deleteProductRow(id));
      if (ok === null) return false;
      void removeProductImage(image);
      const cur = snapRef.current;
      commit({
        ...cur,
        products: cur.products.filter((p) => p.id !== id),
        prices: cur.prices.filter((p) => p.productId !== id),
        ownReports: cur.ownReports.filter((p) => p.productId !== id),
      });
      return true;
    },
    [commit, removeProductImage],
  );

  const uploadProductImage = useCallback(
    async (productId: string, file: File) => {
      if (!userId) return null;
      if (!file.type.startsWith('image/') || file.size > MAX_IMAGE_BYTES) return null;
      const ext = (file.name.split('.').pop() || 'jpg').replace(/[^a-z0-9]/gi, '').slice(0, 5) || 'jpg';
      const path = `${userId}/${productId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).upload(path, file, { upsert: false, contentType: file.type });
      if (error) {
        console.error('Product image upload failed:', error.message);
        return null;
      }
      return supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl as string;
    },
    [userId],
  );

  const reportPrice = useCallback<CompareApi['reportPrice']>(
    async ({ storeId, productId, price, isAvailable = true, source = 'manual' }) => {
      const currency = region?.currency ?? settingsRef.current.currency;
      const status = await guard('Saving a price', () =>
        api.insertReport({ storeId, productId, price, currency, isAvailable, source }),
      );
      if (!status) return null;
      track('price_reported', { source, status });
      // "This price is wrong" isn't a price of the user's own: only the shared one changes.
      const mine: CurrentPrice | null =
        source === 'dispute'
          ? null
          : {
              storeId, productId, price, currency, isAvailable, observedAt: new Date().toISOString(), nReports: 1, confidence: 1, mine: true,
              ...(status === 'pending' ? { held: true } : {}),
            };
      const fresh = await guard('Reading the new price', () => api.fetchPrice(storeId, productId));
      // Read the snapshot only now, so a refresh that landed meanwhile isn't undone.
      const cur = snapRef.current;
      const others = cur.prices.filter((p) => !(p.storeId === storeId && p.productId === productId));
      commit({
        ...cur,
        ownReports: mine ? [mine, ...cur.ownReports.filter((r) => !(r.storeId === storeId && r.productId === productId))] : cur.ownReports,
        // A failed read keeps what we had; "no current price" removes it.
        prices: fresh ? (fresh.price ? [...others, fresh.price] : others) : cur.prices,
      });
      return source === 'dispute' && fresh?.price?.disputed ? 'flagged' : status;
    },
    [commit, region],
  );

  const reportPrices = useCallback<CompareApi['reportPrices']>(
    async (storeId, rows, observedAt) => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return { ok: false, reason: 'offline' };
      const currency = region?.currency ?? settingsRef.current.currency;
      // One row per product (and per new product name): a second report within 10
      // minutes would replace the first. The last one wins.
      const unique = new Map<string, api.ReceiptPrice>();
      for (const r of rows) {
        if (!(r.price > 0)) continue;
        unique.set('productId' in r ? `p:${r.productId}` : `n:${api.productKey(r.newProduct.name)}`, r);
      }
      const items = [...unique.values()];
      let saved: api.ReceiptSaved;
      try {
        saved = await api.saveReceipt(storeId, observedAt, currency, items);
      } catch (error) {
        const code = error instanceof api.ApiError ? error.code : null;
        console.error('Saving receipt prices failed:', code ?? (error instanceof Error ? error.message : error));
        const offline = typeof navigator !== 'undefined' && !navigator.onLine;
        return { ok: false, reason: code === '54000' ? 'rate_limit' : code === '42501' ? 'denied' : offline ? 'offline' : 'error' };
      }
      const pending = saved.reports.filter((r) => r.status === 'pending').length;
      track('receipt_saved', { count: saved.reports.length, pending });
      const at = observedAt ?? new Date().toISOString();
      const priceOf = new Map(items.map((it, i) => [saved.itemProducts[i], it.price]));
      const mine: CurrentPrice[] = saved.reports.map((r) => ({
        storeId, productId: r.productId, price: priceOf.get(r.productId) ?? null, currency, isAvailable: true, observedAt: at, nReports: 1, confidence: 1, mine: true,
        ...(r.status === 'pending' ? { held: true } : {}),
      }));
      const touched = new Set(saved.reports.map((r) => r.productId));
      const fresh = await guard('Reading the new prices', () => api.fetchPricesAt(storeId, [...touched]));
      // Read the snapshot only now, so a refresh that landed meanwhile isn't undone.
      const cur = snapRef.current;
      const here = (p: CurrentPrice) => p.storeId === storeId && touched.has(p.productId);
      const known = new Set(cur.products.map((p) => p.id));
      commit({
        ...cur,
        products: [...saved.created.filter((p) => !known.has(p.id)), ...cur.products],
        ownReports: [...mine, ...cur.ownReports.filter((r) => !here(r))].sort(newestFirst),
        prices: fresh ? [...cur.prices.filter((p) => !here(p)), ...fresh.prices] : cur.prices,
      });
      // Each input row → its product (rows dropped as duplicates share their product).
      const keyOf = (r: api.ReceiptPrice) => ('productId' in r ? `p:${r.productId}` : `n:${api.productKey(r.newProduct.name)}`);
      const productOfKey = new Map([...unique.keys()].map((k, i) => [k, saved.itemProducts[i]]));
      const productIds = rows.map((r) => productOfKey.get(keyOf(r)) ?? ('productId' in r ? r.productId : ''));
      return { ok: true, ids: saved.reports.map((r) => r.id), productIds, accepted: saved.reports.length - pending, pending };
    },
    [commit, region],
  );

  const retractReports = useCallback<CompareApi['retractReports']>(
    async (storeId, ids, productIds, reason = 'receipt') => {
      const done = await guard('Taking back prices', async () => {
        await api.deleteReports(ids);
        return true;
      });
      if (!done) return false;
      track(reason === 'removed' ? 'price_removed' : 'receipt_undone', { count: ids.length });
      const uid = userIdRef.current;
      const [fresh, own] = await Promise.all([
        guard('Reading prices after undo', () => api.fetchPricesAt(storeId, productIds)),
        uid ? guard('Reading your prices', () => api.fetchOwnReports(uid)) : Promise.resolve(null),
      ]);
      const cur = snapRef.current;
      const touched = new Set(productIds);
      const here = (p: CurrentPrice) => p.storeId === storeId && touched.has(p.productId);
      commit({
        ...cur,
        ownReports: own ?? cur.ownReports.filter((r) => !here(r)),
        prices: fresh ? [...cur.prices.filter((p) => !here(p)), ...fresh.prices] : cur.prices,
      });
      return true;
    },
    [commit],
  );

  const suggestBranch = useCallback<CompareApi['suggestBranch']>(
    async (storeId, chain, area, knownChain) => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return 'offline';
      const st = snapRef.current.stores.find((s) => s.id === storeId);
      const city = st?.regionId ?? settingsRef.current.regionId;
      if (!st || !city) return 'denied';
      try {
        if (!st.regionId) {
          // A shop saved without a city is in the one the user is in.
          const row = await api.updateStoreRow(st.id, {
            name: st.name, kind: st.kind, regionId: city, deliveryRule: st.deliveryRule, address: st.address, website: st.website,
          });
          commit({ ...snapRef.current, stores: snapRef.current.stores.map((x) => (x.id === row.id ? row : x)) });
        }
        const row = await api.insertSuggestion({ storeId, regionId: city, chain: cleanPlace(chain), area: cleanPlace(area) });
        commit({ ...snapRef.current, suggestions: [row, ...snapRef.current.suggestions.filter((s) => s.id !== row.id)] });
        track('branch_suggested', { known_chain: knownChain });
        return 'ok';
      } catch (error) {
        const code = error instanceof api.ApiError ? error.code : null;
        console.error('Suggesting a shop failed:', code ?? (error instanceof Error ? error.message : error));
        if (code === '54000') return 'limit';
        if (code === '23505') return 'taken';
        if (code === '42501') return 'denied';
        if (code === '23514') return 'invalid';
        return typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error';
      }
    },
    [commit],
  );

  const withdrawSuggestion = useCallback<CompareApi['withdrawSuggestion']>(
    async (id) => {
      const deleted = await guard('Withdrawing a suggestion', () => api.deleteSuggestion(id));
      if (deleted === null) return 'error';
      if (!deleted) {
        // Decided meanwhile (shared or declined): show what happened.
        void refreshRef.current();
        return 'decided';
      }
      commit({ ...snapRef.current, suggestions: snapRef.current.suggestions.filter((s) => s.id !== id) });
      track('branch_suggestion_withdrawn');
      return 'ok';
    },
    [commit],
  );

  // ── Price checks while shopping ─────────────────────────────────────────────
  /** The user's new reports on top (held ones marked), and those prices read again per store. */
  const settleChecks = useCallback(
    async (rows: api.NewReport[], held: Set<string>) => {
      const now = new Date().toISOString();
      const mine: CurrentPrice[] = rows.map((r) => ({
        storeId: r.storeId, productId: r.productId, price: r.price, currency: r.currency, isAvailable: r.isAvailable,
        observedAt: r.observedAt ?? now, nReports: 1, confidence: 1, mine: true,
        ...(held.has(pairKey(r.storeId, r.productId)) ? { held: true } : {}),
      }));
      const byStore = new Map<string, string[]>();
      for (const r of rows) byStore.set(r.storeId, [...(byStore.get(r.storeId) ?? []), r.productId]);
      const online = typeof navigator === 'undefined' || navigator.onLine;
      const fresh = online
        ? await Promise.all([...byStore].map(async ([storeId, ids]) => ({ storeId, ids: new Set(ids), res: await guard('Reading checked prices', () => api.fetchPricesAt(storeId, ids)) })))
        : [];
      // Read the snapshot only now, so a refresh that landed meanwhile isn't undone.
      const cur = snapRef.current;
      const touched = new Set(rows.map((r) => pairKey(r.storeId, r.productId)));
      let prices = cur.prices;
      for (const f of fresh) {
        if (f.res) prices = [...prices.filter((p) => !(p.storeId === f.storeId && f.ids.has(p.productId))), ...f.res.prices];
      }
      commit({ ...cur, ownReports: [...mine, ...cur.ownReports.filter((r) => !touched.has(pairKey(r.storeId, r.productId)))].sort(newestFirst), prices });
    },
    [commit],
  );

  const checkPrices = useCallback<CompareApi['checkPrices']>(
    async (rows, from) => {
      const uid = userIdRef.current;
      if (!uid || !rows.length) return null;
      const currency = region?.currency ?? settingsRef.current.currency;
      // One per store and product (a second within 10 minutes would replace the first).
      const reports: api.NewReport[] = [...new Map(rows.map((r) => [pairKey(r.storeId, r.productId), { ...r, currency }])).values()];
      const counts = {
        yes: reports.filter((r) => r.source === 'confirm').length,
        changed: reports.filter((r) => r.source === 'trip' && r.price != null).length,
        gone: reports.filter((r) => r.price == null).length,
      };
      const later = async () => {
        // Seen now; sent when back online (RLS takes up to 90 days back).
        const at = new Date().toISOString();
        const queued = reports.map((r) => ({ ...r, observedAt: at }));
        pushQueue(uid, queued);
        track('price_check', { from, ...counts, queued: queued.length });
        await settleChecks(queued, new Set());
        return { saved: 0, held: 0, queued: queued.length };
      };
      if (typeof navigator !== 'undefined' && !navigator.onLine) return later();
      let saved: Awaited<ReturnType<typeof api.insertReports>>;
      try {
        saved = await api.insertReports(reports);
      } catch (error) {
        const code = error instanceof api.ApiError ? error.code : null;
        // No code: it never reached the database (connection dropped), so send it later.
        if (!code) return later();
        console.error('Saving price checks failed:', code);
        return null;
      }
      const held = new Set(saved.filter((r) => r.status === 'pending').map((r) => pairKey(r.storeId, r.productId)));
      track('price_check', { from, ...counts, queued: 0 });
      await settleChecks(reports, held);
      return { saved: saved.length, held: held.size, queued: 0 };
    },
    [region, settleChecks],
  );

  // Answers kept on this device go out once the app is online.
  const flushing = useRef(false);
  const flushQueue = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid || flushing.current || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
    const rows = readQueue(uid);
    if (!rows.length) return;
    flushing.current = true;
    try {
      const saved = await api.insertReports(rows);
      dropFromQueue(uid, rows);
      track('price_check_sent', { count: saved.length });
      await settleChecks(rows, new Set(saved.filter((r) => r.status === 'pending').map((r) => pairKey(r.storeId, r.productId))));
    } catch (error) {
      const code = error instanceof api.ApiError ? error.code : null;
      // Refused (a policy, the daily limit, a store or product gone): don't retry forever.
      if (code) {
        dropFromQueue(uid, rows);
        console.error('Sending saved price checks failed:', code);
      }
    } finally {
      flushing.current = false;
    }
  }, [settleChecks]);

  useEffect(() => {
    if (ready && online && userId) void flushQueue();
  }, [ready, online, userId, flushQueue]);

  const clearLocalData = useCallback(async () => {
    if (!userId) return;
    clearQueue(userId);
    clearChecks(userId);
    await deleteSnapshot(userId);
  }, [userId]);

  const api_: CompareApi = {
    ready,
    refreshing,
    failed,
    online,
    syncedAt: snap.syncedAt,
    regions: snap.regions,
    region,
    regionChosen: regionId != null,
    isLive: region?.status === 'live',
    fmt: (n) => formatPrice(n ?? 0, region?.currency ?? settings.currency),
    currency: region?.currency ?? settings.currency,
    setRegion: (id) => updateSettings({ regionId: id }),
    stores: snap.stores,
    products: snap.products,
    storeById: (id) => storeMap.get(id),
    productById: (id) => productMap.get(id),
    pricesFor: (id) => byProduct.get(id) || [],
    priceAt: (storeId, productId) => effective.get(pairKey(storeId, productId)),
    myStoreIds: snap.myStores,
    defaultStoreIds,
    consideredStores,
    setMyStores,
    preferences,
    setUsual,
    clearUsual,
    resolveContext,
    planFor,
    recordPlan,
    savedThisMonth,
    plansThisMonth: snap.plans.length,
    // Not at a closed shop: a shop that became shared has its prices there and here.
    recentReports: snap.ownReports.filter((r) => storeMap.get(r.storeId)?.status !== 'closed').length,
    suggestions: snap.suggestions,
    suggestionFor: (id) => snap.suggestions.find((s) => s.storeId === id),
    movedTo: (id) => moved.get(id) ?? null,
    suggestBranch,
    withdrawSuggestion,
    addStore,
    updateStore,
    deleteStore,
    addProduct,
    updateProduct,
    deleteProduct,
    uploadProductImage,
    removeProductImage,
    reportPrice,
    pricesAtStore: (id) => byStore.get(id) || [],
    ownReportsAt: (id) => ownByStore.get(id) || [],
    ownReports: snap.ownReports,
    reportPrices,
    retractReports,
    refresh,
    convertedCart,
    clearLocalData,
    checkPrices,
  };

  return <CompareContext.Provider value={api_}>{children}</CompareContext.Provider>;
};
