// Delivery-aware cart optimizer, ported from the SpendLess design handoff
// (`data.jsx`) onto the app's real types. Operates on Product.prices (a
// Price[] keyed by storeId, filtered by availability) and Store.deliveryRule.
//
// Goal: minimise (sum of item unit-prices at chosen stores)
//                + (sum of per-store delivery fees).

import { Product, Store, DeliveryRule } from '../types';

export interface CartLine {
  id: string; // productId
  qty: number;
}

export interface PriceRange {
  min: number;
  max: number;
  bestStoreId: string | null;
  count: number;
}

export interface PlanItem {
  product: Product;
  qty: number;
  unit: number; // unit price at the assigned store
  line: number; // unit * qty
}

export interface StoreBreakdown {
  store: Store;
  items: PlanItem[];
  subtotal: number;
  delivery: number;
  total: number;
}

export interface OptimizedPlan {
  perStore: StoreBreakdown[];
  itemsTotal: number;
  deliveryTotal: number;
  grandTotal: number;
  storeCount: number;
  savings: number;
}

// --- Catalogue access helpers ------------------------------------------------

/** Map of available { storeId: price } for a product. */
export const priceMap = (product: Product): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const p of product.prices || []) {
    if (p.isAvailable !== false && typeof p.price === 'number' && p.price > 0) {
      // keep the lowest if duplicated per store
      if (out[p.storeId] == null || p.price < out[p.storeId]) out[p.storeId] = p.price;
    }
  }
  return out;
};

/** min / max / best store across the stores that stock a product. */
export const priceRange = (product: Product): PriceRange | null => {
  const entries = Object.entries(priceMap(product));
  if (!entries.length) return null;
  let min = Infinity;
  let max = -Infinity;
  let bestStoreId: string | null = null;
  for (const [sid, price] of entries) {
    if (price < min) {
      min = price;
      bestStoreId = sid;
    }
    if (price > max) max = price;
  }
  return { min, max, bestStoreId, count: entries.length };
};

// --- Delivery rules ----------------------------------------------------------

/** Derive a DeliveryRule from a store, falling back to legacy fields. */
export const deliveryRuleOf = (store: Store): DeliveryRule => {
  if (store.deliveryRule) return store.deliveryRule;
  if (!store.hasDelivery) return { type: 'none' };
  if (store.deliveryFee && store.deliveryFee > 0) return { type: 'flat', fee: store.deliveryFee };
  return { type: 'free' };
};

export const deliveryFee = (store: Store, subtotal: number): number => {
  const d = deliveryRuleOf(store);
  if (d.type === 'none' || d.type === 'free') return 0;
  if (d.type === 'flat') return d.fee;
  if (d.type === 'over') return subtotal >= d.threshold ? 0 : d.fee;
  return 0;
};

export const deliveryLabel = (store: Store, fmt: (n: number) => string): string => {
  const d = deliveryRuleOf(store);
  if (d.type === 'none') return store.type === 'physical' ? 'In-store · no delivery' : 'No delivery';
  if (d.type === 'free') return 'Free delivery';
  if (d.type === 'flat') return `${fmt(d.fee)} delivery`;
  if (d.type === 'over') return `Free over ${fmt(d.threshold)} · else ${fmt(d.fee)}`;
  return '';
};

// --- Optimizer ---------------------------------------------------------------

const breakdownFor = (
  assignment: Record<string, string>,
  lines: CartLine[],
  products: Map<string, Product>,
  stores: Map<string, Store>,
): Omit<OptimizedPlan, 'storeCount' | 'savings'> => {
  const byStore: Record<string, CartLine[]> = {};
  for (const line of lines) {
    const sid = assignment[line.id];
    if (!sid) continue;
    (byStore[sid] = byStore[sid] || []).push(line);
  }
  const perStore: StoreBreakdown[] = Object.entries(byStore)
    .map(([sid, group]) => {
      const store = stores.get(sid);
      if (!store) return null;
      const items: PlanItem[] = group.map((l) => {
        const product = products.get(l.id)!;
        const unit = priceMap(product)[sid];
        return { product, qty: l.qty, unit, line: unit * l.qty };
      });
      const subtotal = items.reduce((a, i) => a + i.line, 0);
      const delivery = deliveryFee(store, subtotal);
      return { store, items, subtotal, delivery, total: subtotal + delivery };
    })
    .filter((x): x is StoreBreakdown => x !== null);

  perStore.sort((a, b) => b.total - a.total);
  const itemsTotal = perStore.reduce((a, s) => a + s.subtotal, 0);
  const deliveryTotal = perStore.reduce((a, s) => a + s.delivery, 0);
  return { perStore, itemsTotal, deliveryTotal, grandTotal: itemsTotal + deliveryTotal };
};

/**
 * Optimize a cart across stores. Brute-forces every item→store assignment when
 * the combination space is small (≤ 300,000), else greedy per-item-cheapest.
 */
export const optimizeCart = (
  cartLines: CartLine[],
  products: Product[],
  stores: Store[],
): OptimizedPlan | null => {
  const productMap = new Map(products.map((p) => [p.id, p]));
  const storeMap = new Map(stores.map((s) => [s.id, s]));

  const lines = cartLines.filter((l) => l.qty > 0 && productMap.has(l.id));
  // store options per line (stores that stock the product)
  const options = lines.map((l) => Object.keys(priceMap(productMap.get(l.id)!)));
  // drop lines with no available price anywhere
  const valid = lines.filter((_, i) => options[i].length > 0);
  const validOptions = options.filter((o) => o.length > 0);
  if (!valid.length) return null;

  const space = validOptions.reduce((a, o) => a * Math.max(o.length, 1), 1);

  let best: Omit<OptimizedPlan, 'storeCount' | 'savings'> | null = null;
  const evaluate = (assignment: Record<string, string>) => {
    const b = breakdownFor(assignment, valid, productMap, storeMap);
    if (!best || b.grandTotal < best.grandTotal - 1e-9) best = b;
  };

  if (space <= 300000) {
    const assignment: Record<string, string> = {};
    const recurse = (i: number) => {
      if (i === valid.length) {
        evaluate(assignment);
        return;
      }
      for (const sid of validOptions[i]) {
        assignment[valid[i].id] = sid;
        recurse(i + 1);
      }
    };
    recurse(0);
  } else {
    const assignment: Record<string, string> = {};
    valid.forEach((l) => {
      const pm = priceMap(productMap.get(l.id)!);
      assignment[l.id] = Object.entries(pm).sort((a, b) => a[1] - b[1])[0][0];
    });
    evaluate(assignment);
  }

  // Baseline for understated savings: each item at its cheapest unit price,
  // charging delivery for every store that ends up involved.
  const naive: Record<string, string> = {};
  valid.forEach((l) => {
    const pm = priceMap(productMap.get(l.id)!);
    naive[l.id] = Object.entries(pm).sort((a, b) => a[1] - b[1])[0][0];
  });
  const naiveBreak = breakdownFor(naive, valid, productMap, storeMap);
  const savings = Math.max(0, naiveBreak.grandTotal - best!.grandTotal);

  return { ...best!, storeCount: best!.perStore.length, savings };
};
