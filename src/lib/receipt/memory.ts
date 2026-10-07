// What the user chose for receipt lines, per chain ("Funchies Mingalz Chocolate
// Filled C…" at Panda Mart → that product, or "not a product"), so the next receipt
// matches on its own. Kept on this device only (IndexedDB, one database per user),
// never uploaded; deleted on sign-out. App-only.
import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';

const VERSION = 1;
/** Most lines remembered; the oldest go first. */
const MAX_LINES = 3000;
export const NOT_A_PRODUCT = 'none';

interface LineRow {
  /** `${chainKey}|${lineKey}` */
  key: string;
  chain: string;
  /** A product id, or NOT_A_PRODUCT. */
  value: string;
  at: number;
}

const dbName = (uid: string) => `spendless-receipts-${uid}`;
const opened = new Map<string, Promise<IDBPDatabase>>();

function open(uid: string): Promise<IDBPDatabase> {
  let p = opened.get(uid);
  if (!p) {
    p = openDB(dbName(uid), VERSION, {
      upgrade(db) {
        const lines = db.createObjectStore('lines', { keyPath: 'key' });
        lines.createIndex('chain', 'chain');
        lines.createIndex('at', 'at');
        db.createObjectStore('meta');
      },
    });
    opened.set(uid, p);
  }
  return p;
}

/** One key per chain (or store, when it has no chain). */
export const chainKey = (s: { chain: string | null; name: string; id: string }) =>
  (s.chain || s.name || s.id).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Remembered choices at a chain: line key → product id or NOT_A_PRODUCT. */
export async function linesFor(uid: string, chain: string): Promise<Map<string, string>> {
  try {
    const db = await open(uid);
    const rows = (await db.getAllFromIndex('lines', 'chain', chain)) as LineRow[];
    return new Map(rows.map((r) => [r.key.slice(chain.length + 1), r.value]));
  } catch (error) {
    console.error('Reading receipt memory failed:', error instanceof Error ? error.message : error);
    return new Map();
  }
}

/** Remember choices for some lines at a chain. */
export async function rememberLines(uid: string, chain: string, entries: [lineKey: string, value: string][]): Promise<void> {
  if (!entries.length) return;
  try {
    const db = await open(uid);
    const tx = db.transaction('lines', 'readwrite');
    const now = Date.now();
    for (const [line, value] of entries) await tx.store.put({ key: `${chain}|${line}`, chain, value, at: now } satisfies LineRow);
    const count = await tx.store.count();
    if (count > MAX_LINES) {
      let extra = count - MAX_LINES;
      let cursor = await tx.store.index('at').openCursor();
      while (cursor && extra-- > 0) {
        await cursor.delete();
        cursor = await cursor.continue();
      }
    }
    await tx.done;
  } catch (error) {
    console.error('Saving receipt memory failed:', error instanceof Error ? error.message : error);
  }
}

/** The store the user picked last for receipts of a chain (or for any, under ''). */
export async function lastStore(uid: string, chain: string): Promise<string | null> {
  try {
    return ((await (await open(uid)).get('meta', `store:${chain}`)) as string | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function setLastStore(uid: string, chain: string, storeId: string): Promise<void> {
  try {
    await (await open(uid)).put('meta', storeId, `store:${chain}`);
  } catch {
    /* not essential */
  }
}

/** Sign-out: delete everything remembered for this user on this device. */
export async function deleteReceiptMemory(uid: string): Promise<void> {
  try {
    const p = opened.get(uid);
    opened.delete(uid);
    if (p) (await p).close();
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(dbName(uid));
      req.onsuccess = req.onerror = req.onblocked = () => resolve();
    });
  } catch (error) {
    console.error('Clearing receipt memory failed:', error instanceof Error ? error.message : error);
  }
}
