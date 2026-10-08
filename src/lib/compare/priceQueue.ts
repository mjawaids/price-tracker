// Price checks answered offline wait here (this device, per user) and are sent when
// the app is back online. localStorage; deleted on sign-out. App-only.
import type { NewReport } from './api';

const key = (uid: string) => `spendless-price-queue:${uid}`;
/** Kept at most this many, newest last. */
const MAX = 200;
/** Answers older than this aren't sent (the price may well have changed). */
const MAX_AGE_MS = 7 * 86400000;

export function readQueue(uid: string, now = Date.now()): NewReport[] {
  try {
    const raw = localStorage.getItem(key(uid));
    const rows = raw ? (JSON.parse(raw) as NewReport[]) : [];
    return Array.isArray(rows) ? rows.filter((r) => r && r.observedAt && now - Date.parse(r.observedAt) < MAX_AGE_MS) : [];
  } catch {
    return [];
  }
}

function write(uid: string, rows: NewReport[]) {
  try {
    if (rows.length) localStorage.setItem(key(uid), JSON.stringify(rows.slice(-MAX)));
    else localStorage.removeItem(key(uid));
  } catch {
    /* storage full or blocked: the answers are lost, nothing else breaks */
  }
}

/** Add answers (each with its `observedAt`); a later one for the same store and product replaces an earlier one. */
export function pushQueue(uid: string, rows: NewReport[]) {
  const all = [...readQueue(uid), ...rows];
  const byPair = new Map(all.map((r) => [`${r.storeId}|${r.productId}`, r]));
  write(uid, [...byPair.values()]);
}

/** Drop the answers that were sent (or refused), keeping any added meanwhile. */
export function dropFromQueue(uid: string, sent: NewReport[]) {
  const gone = new Set(sent.map((r) => `${r.storeId}|${r.productId}|${r.observedAt}`));
  write(uid, readQueue(uid).filter((r) => !gone.has(`${r.storeId}|${r.productId}|${r.observedAt}`)));
}

export function clearQueue(uid: string) {
  try {
    localStorage.removeItem(key(uid));
  } catch {
    /* nothing to clear */
  }
}
