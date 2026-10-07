// Receipt review logic for the screen: the store, the match index, the rows the user
// sees (with their edits), and saving. The pure steps live in src/lib/receipt/.
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCompare } from '../../contexts/CompareContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import type { ReceiptSaveResult } from '../../contexts/CompareContext';
import { parseProductName } from '../../lib/compare/productName';
import type { CatalogStore, CurrentPrice } from '../../lib/compare/types';
import type { ProductInput } from '../../lib/compare/api';
import { ageInDays, MAX_AGE_DAYS } from '../../lib/receipt/dates';
import { brandKeyOf, buildIndex } from '../../lib/receipt/match';
import type { Candidate, Scored } from '../../lib/receipt/match';
import { chainKey, linesFor, NOT_A_PRODUCT, rememberLines, setLastStore } from '../../lib/receipt/memory';
import type { ReceiptItem } from '../../lib/receipt/parse';
import { buildReview, lineKey } from '../../lib/receipt/review';
import type { ReviewRow } from '../../lib/receipt/review';
import { getReceipt, setReceipt } from '../../lib/receipt/session';
import type { ReceiptState, SavedReceipt } from '../../lib/receipt/session';
import type { StoreGuess } from '../../lib/receipt/stores';

export type Group = 'ready' | 'check' | 'choose' | 'medicine' | 'already';

/** One receipt line as the review shows it. */
export interface Line {
  id: string;
  item: ReceiptItem;
  group: Group;
  productId: string | null;
  include: boolean;
  /** Price for one (after the item's own discount). */
  unitPrice: number;
  quantity: number;
  note: ReviewRow['note'];
  suggestions: Scored[];
  /** The user picked the product themselves. */
  chosen: boolean;
  remembered: boolean;
  /** Has a product, or is a medicine (a private product is made for it). */
  saveable: boolean;
  /** The user's own price for it here on the receipt's date (Already added). */
  already: CurrentPrice | null;
}

/** A line that isn't a product: fees, discounts, payment — or one the user said isn't. */
export interface NotProduct {
  key: string;
  label: string;
  amount: number;
  discount: boolean;
  /** The receipt item it is (restorable), else a summary line. */
  itemId: string | null;
}

const EMPTY: CurrentPrice[] = [];

/** "phone" on a phone, "device" elsewhere (copy about where the receipt is read). */
export function useDeviceWord() {
  const { compact } = useBreakpoint();
  return compact ? 'phone' : 'device';
}
const pad = (n: number) => String(n).padStart(2, '0');

/** A local calendar date as YYYY-MM-DD. */
export const localISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => localISO(new Date());

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "4 Oct" (with the year when it isn't this year). */
export function shortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}${y !== new Date().getFullYear() ? ` ${y}` : ''}`;
}

/** "18 January" for longer sentences. */
export function longDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS_LONG[m - 1]}${y !== new Date().getFullYear() ? ` ${y}` : ''}`;
}

/** The date the prices are saved for: the user's pick, else the receipt's, else today. */
export function receiptDate(r: ReceiptState): { date: string; fromReceipt: boolean; ambiguous: boolean; alternative: string | null } {
  const read = r.parsed?.date ?? null;
  if (r.date) return { date: r.date, fromReceipt: false, ambiguous: false, alternative: null };
  if (read) return { date: read.date, fromReceipt: true, ambiguous: read.ambiguous, alternative: read.alternative };
  return { date: todayISO(), fromReceipt: false, ambiguous: false, alternative: null };
}

export const tooOld = (date: string) => ageInDays(date) > MAX_AGE_DAYS;

/**
 * When the prices were seen: null for today (the database uses now), else local noon
 * of that day, never earlier than the 90 days the database accepts.
 */
export function observedAtFor(date: string, now = new Date()): string | null {
  if (date >= localISO(now)) return null;
  const [y, m, d] = date.split('-').map(Number);
  const noon = new Date(y, m - 1, d, 12).getTime();
  const earliest = now.getTime() - MAX_AGE_DAYS * 86_400_000 + 10 * 60_000;
  return new Date(Math.max(noon, earliest)).toISOString();
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** The memory key for a receipt's shop before a store is chosen (chain, else its name). */
export const guessKey = (g: StoreGuess | null) => (g && (g.chain || g.name) ? chainKey({ chain: g.chain, name: g.name ?? '', id: '' }) : null);

/**
 * The store a receipt is from, when the guess names exactly one: same chain (or
 * name), same kind (an in-store receipt never goes to the online store), and the
 * printed area when there are several branches.
 */
export function storeForGuess(stores: CatalogStore[], guess: StoreGuess | null): CatalogStore | null {
  if (!guess || !(guess.chain || guess.name)) return null;
  const want = norm((guess.chain || guess.name) as string);
  let pool = stores.filter((s) => s.status !== 'closed' && (norm(s.chain ?? '') === want || norm(s.name) === want || norm(s.name).startsWith(`${want} `)));
  if (guess.kind) pool = pool.filter((s) => s.kind === guess.kind);
  if (pool.length > 1 && guess.area) {
    const area = norm(guess.area);
    const hit = pool.filter((s) => norm(`${s.name} ${s.address ?? ''}`).includes(area));
    if (hit.length) pool = hit;
  }
  return pool.length === 1 ? pool[0] : null;
}

/** The review for the receipt in the session: rows with edits applied, and what isn't a product. */
export function useReview(r: ReceiptState) {
  const compare = useCompare();
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const store = r.storeId ? compare.storeById(r.storeId) ?? null : null;
  // pricesAtStore returns the same array until prices change, so it's safe as a dependency.
  const storePrices = store ? compare.pricesAtStore(store.id) : EMPTY;
  const ownHere = store ? compare.ownReportsAt(store.id) : EMPTY;
  const profiles = compare.resolveContext.profiles;
  const productIds = useMemo(() => new Set(compare.products.map((p) => p.id)), [compare.products]);

  // Every product can be suggested; only the store's own (and the user's) are picked on their own.
  const index = useMemo(() => {
    if (!store) return null;
    const at = new Map(storePrices.map((p) => [p.productId, p]));
    const cands: Candidate[] = [];
    const brands = new Set<string>();
    for (const pr of profiles.values()) {
      const here = at.get(pr.product.id);
      const brandKey = pr.brand ? brandKeyOf(pr.brand) : null;
      if (brandKey) brands.add(brandKey);
      cands.push({
        id: pr.product.id,
        name: pr.product.name,
        brandKey,
        itemType: pr.itemType,
        size: pr.size,
        price: here?.price ?? null,
        local: !!here || !!pr.product.ownerId,
      });
    }
    return buildIndex(cands, brands);
  }, [store, storePrices, profiles]);

  // What the user chose for lines at this chain before (on this device only).
  const chain = store ? chainKey(store) : null;
  const [stored, setStored] = useState<{ chain: string; lines: Map<string, string> } | null>(null);
  useEffect(() => {
    if (!uid || !chain) return;
    let off = false;
    void linesFor(uid, chain).then((lines) => {
      if (!off) setStored({ chain, lines });
    });
    return () => {
      off = true;
    };
  }, [uid, chain]);
  const mem = stored && stored.chain === chain ? stored.lines : null;
  const loading = !!store && !!uid && !mem;

  // A line the user said is a product after all ignores a remembered "not a product".
  const restored = (r.parsed?.items ?? []).filter((i) => r.edits[i.id]?.notProduct === false).map((i) => i.id).join(',');
  const memory = useMemo(() => {
    if (!mem || !restored || !r.parsed) return mem ?? undefined;
    const ids = new Set(restored.split(','));
    const m = new Map(mem);
    for (const i of r.parsed.items) if (ids.has(i.id)) m.delete(lineKey(i.name));
    return m;
  }, [mem, restored, r.parsed]);

  const base = useMemo(
    () =>
      r.parsed && !loading
        ? buildReview({
            items: r.parsed.items,
            index,
            pharmacyStore: !!r.guess?.pharmacy,
            addsUp: r.parsed.addsUp,
            memory,
            exists: (id) => productIds.has(id),
          })
        : [],
    [r.parsed, r.guess, index, memory, loading, productIds],
  );

  const { date } = receiptDate(r);
  const lines = useMemo(() => {
    // Newest first, so the first report that day per product is the latest.
    const ownThatDay = new Map<string, CurrentPrice>();
    for (const p of ownHere) if (localISO(new Date(p.observedAt)) === date && !ownThatDay.has(p.productId)) ownThatDay.set(p.productId, p);
    const out: Line[] = [];
    for (const row of base) {
      const e = r.edits[row.item.id] ?? {};
      if (e.notProduct) continue;
      const chosen = !!e.productId;
      const productId = e.productId ?? row.productId;
      const unitPrice = e.unitPrice ?? row.item.unitPrice;
      const own = productId ? ownThatDay.get(productId) ?? null : null;
      // Only lines we'd save on their own move to "Already added"; a choice stays put.
      const already = own && !chosen && (row.status === 'ready' || row.status === 'medicine') && own.price != null && Math.abs(own.price - unitPrice) <= Math.max(1, unitPrice * 0.01) ? own : null;
      const group: Group = already ? 'already' : row.status;
      const saveable = !!productId || row.status === 'medicine';
      out.push({
        id: row.item.id,
        item: row.item,
        group,
        productId,
        include: saveable && unitPrice > 0 && (e.include ?? (already ? false : chosen ? true : row.include)),
        unitPrice,
        quantity: e.quantity ?? row.item.quantity,
        note: chosen ? null : row.note,
        suggestions: row.suggestions,
        chosen,
        remembered: row.remembered,
        saveable,
        already,
      });
    }
    return out;
  }, [base, r.edits, ownHere, date]);

  const notProducts = useMemo(() => {
    if (!r.parsed) return [];
    const shown = new Set(base.map((b) => b.item.id));
    const out: NotProduct[] = r.parsed.summary
      .filter((s) => s.kind !== 'subtotal' && s.kind !== 'total')
      .map((s, i) => ({ key: `s${i}`, label: s.label, amount: s.amount, discount: s.kind === 'discount', itemId: null }));
    for (const item of r.parsed.items) {
      // Skipped by the review (remembered as not a product), or marked so now.
      if ((!shown.has(item.id) && !loading) || r.edits[item.id]?.notProduct) {
        out.push({ key: item.id, label: item.name, amount: item.lineTotal, discount: false, itemId: item.id });
      }
    }
    return out;
  }, [r.parsed, r.edits, base, loading]);

  return { store, storePrices, index, lines, notProducts, loading, chain };
}

/** A medicine line → the user's own private product. */
function medicineProduct(name: string): ProductInput {
  const p = parseProductName(name);
  return {
    name: p.name,
    brand: p.brand,
    variant: p.variant,
    itemType: p.itemType?.id ?? null,
    category: 'pharmacy',
    sizeValue: p.size?.value ?? null,
    sizeUnit: p.size?.unit ?? null,
    packCount: p.size?.pack ?? 1,
    unitLabel: null,
  };
}

export type SaveOutcome = { ok: true; saved: SavedReceipt } | { ok: false; reason: Extract<ReceiptSaveResult, { ok: false }>['reason'] };

type CompareApi = ReturnType<typeof useCompare>;

/** Save the ticked lines at the store, remember the user's choices, and say what happened. */
export async function saveReceipt(
  compare: CompareApi,
  uid: string | null,
  store: CatalogStore,
  r: ReceiptState,
  lines: Line[],
): Promise<SaveOutcome> {
  const picked = lines.filter((l) => l.include && l.saveable && l.unitPrice > 0);
  if (!picked.length) return { ok: false, reason: 'error' };
  if (!compare.online) return { ok: false, reason: 'offline' };

  // Medicines without a product: one private product per distinct name. Their ids go
  // into the edits first, so trying again after a failed save doesn't make them twice.
  const created = new Map<string, string>();
  const needing = picked.filter((l) => !l.productId);
  if (needing.length) {
    const inputs = new Map<string, ProductInput>();
    for (const l of needing) {
      const input = medicineProduct(l.item.name);
      inputs.set(input.name.trim().slice(0, 160).toLowerCase(), input);
    }
    const rows = await compare.addProducts([...inputs.values()]);
    if (!rows || rows.length !== inputs.size) return { ok: false, reason: compare.online ? 'error' : 'offline' };
    const byName = new Map(rows.map((p) => [p.name.toLowerCase(), p.id]));
    for (const l of needing) {
      const id = byName.get(medicineProduct(l.item.name).name.trim().slice(0, 160).toLowerCase());
      if (!id) return { ok: false, reason: 'error' };
      created.set(l.id, id);
    }
    setReceipt((s) => ({
      edits: { ...s.edits, ...Object.fromEntries([...created].map(([lineId, productId]) => [lineId, { ...s.edits[lineId], productId }])) },
    }));
  }

  const productOf = (l: Line) => (l.productId ?? created.get(l.id)) as string;
  const { date } = receiptDate(r);
  const res = await compare.reportPrices(
    store.id,
    picked.map((l) => ({ productId: productOf(l), price: l.unitPrice })),
    observedAtFor(date),
  );
  if (!res.ok) return res;

  // Remember choices for next time (on this device): picked products, new medicines
  // and "not a product" lines — unless the user turned remembering off for one.
  const edits = getReceipt().edits;
  const choices: [string, string][] = [];
  for (const l of lines) {
    const e = edits[l.id];
    if (!e || e.remember === false) continue;
    if (created.has(l.id)) continue;
    if (l.chosen && l.productId) choices.push([lineKey(l.item.name), l.productId]);
  }
  for (const item of r.parsed?.items ?? []) {
    const e = edits[item.id];
    if (e?.notProduct && e.remember !== false) choices.push([lineKey(item.name), NOT_A_PRODUCT]);
  }
  const medicines: [string, string][] = picked.filter((l) => created.has(l.id)).map((l) => [lineKey(l.item.name), created.get(l.id) as string]);
  if (uid) {
    await rememberLines(uid, chainKey(store), [...choices, ...medicines]);
    const key = guessKey(r.guess);
    if (key) await setLastStore(uid, key, store.id);
  }

  const productIds = [...new Set(picked.map(productOf))];
  return {
    ok: true,
    saved: {
      storeId: store.id,
      ids: res.ids,
      productIds,
      accepted: res.accepted,
      pending: res.pending,
      remembered: choices.length,
      medicines: picked.filter((l) => l.group === 'medicine').length,
      onlyYou: picked.filter((l) => created.has(l.id) || !!compare.productById(productOf(l))?.ownerId).length,
      skipped: Math.max(0, (r.parsed?.items.length ?? 0) - picked.length),
      date,
    },
  };
}
