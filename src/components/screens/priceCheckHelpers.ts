// Non-component helpers for price checks while shopping (kept apart for fast refresh):
// which ticked item to ask "Was it Rs 210?" about, and the words after an answer.
import type { CheckResult, useCompare } from '../../contexts/CompareContext';
import type { ListItem } from '../../types';
import { CHECK_TTL_MS, CheckState, isAnswered, isDismissed } from '../../lib/compare/checkState';
import { HELD_MESSAGE } from './compareHelpers';

type Compare = ReturnType<typeof useCompare>;

/** One question: the planned product's current price at the planned store. */
export interface PriceAsk {
  itemId: string;
  itemName: string;
  storeId: string;
  storeName: string;
  /** A shared store (prices go to everyone); else the user's own (private). */
  shared: boolean;
  productId: string;
  productName: string;
  /** For one pack. */
  price: number;
  observedAt: string;
  /** Several packs on the list ("2 milk"): the price is "each". */
  each: boolean;
}

/** The store an item's plan puts it in (a shop that became shared → the shared one). */
export const planStoreOf = (compare: Compare, item: ListItem) =>
  item.planStoreId ? compare.movedTo(item.planStoreId) ?? item.planStoreId : null;

const sameDay = (iso: string, now = new Date()) => {
  const d = new Date(iso);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
};

/**
 * What to ask about a ticked item, if anything: a planned product with a current price
 * at an open store, not answered or waved off ("Not now") for this list lately, and not
 * the user's own price from today.
 */
export function priceAskFor(compare: Compare, checks: CheckState, listId: string, item: ListItem): PriceAsk | null {
  const storeId = planStoreOf(compare, item);
  if (!storeId || !item.planProductId) return null;
  if (isAnswered(checks, listId, item.id) || isDismissed(checks, listId, storeId)) return null;
  const store = compare.storeById(storeId);
  const product = compare.productById(item.planProductId);
  if (!store || store.status !== 'active' || !product) return null;
  const p = compare.priceAt(storeId, product.id);
  if (!p || p.price == null || !(p.price > 0) || !p.isAvailable) return null;
  if (p.mine && sameDay(p.observedAt)) return null;
  return {
    itemId: item.id,
    itemName: item.name,
    storeId,
    storeName: store.name,
    shared: !store.ownerId,
    productId: product.id,
    productName: product.name,
    price: p.price,
    observedAt: p.observedAt,
    each: (item.quantity ?? 1) > 1 && !item.unit,
  };
}

/** Ticked here within a shopping trip's time (the summary only covers this trip). */
export const doneLately = (item: ListItem, now = Date.now()) =>
  item.done && !item.clearedAt && !!item.doneAt && now - Date.parse(item.doneAt) < CHECK_TTL_MS;

const QUEUED = 'Saved on this device. It’s sent when you’re back online.';
const FAILED = 'Couldn’t save — check your connection and try again.';

/** After one answer from the tick toast or "What did it cost?". */
export function checkMessage(r: CheckResult | null, ask: PriceAsk, kind: 'yes' | 'changed' | 'gone', fmt: (n: number) => string): string {
  if (!r) return FAILED;
  if (r.queued) return QUEUED;
  if (r.held) return HELD_MESSAGE;
  if (kind === 'yes') return `Thanks — ${fmt(ask.price)} confirmed at ${ask.storeName}`;
  if (kind === 'gone') return 'Thanks — marked as out of stock there';
  return ask.shared ? 'Thanks — price saved and shared' : 'Price saved';
}

/** After the store summary is saved. */
export function summaryMessage(r: CheckResult): string {
  if (r.queued) return r.queued === 1 ? QUEUED : 'Saved on this device. They’re sent when you’re back online.';
  const n = r.saved;
  return `Thanks — ${n} ${n === 1 ? 'answer' : 'answers'} saved.${r.held ? ` ${r.held} ${r.held === 1 ? 'is' : 'are'} just for you for now.` : ''}`;
}
