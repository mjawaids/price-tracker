// IndexedDB store for the Lists section. One database per user so signing out
// (or another account on the same device) never mixes data.
import { openDB, deleteDB, DBSchema, IDBPDatabase } from 'idb';
import { GroceryList, ListItem } from '../../types';

export type SyncTable = 'lists' | 'list_items';

/** A pending upsert. Keyed by `${table}:${rowId}` so edits to one row coalesce. */
export interface OutboxEntry {
  key: string;
  table: SyncTable;
  row: GroceryList | ListItem;
  seq: number;
}

interface ListsDB extends DBSchema {
  lists: { key: string; value: GroceryList };
  items: { key: string; value: ListItem };
  outbox: { key: string; value: OutboxEntry };
  meta: { key: string; value: string };
}

export type ListsDb = IDBPDatabase<ListsDB>;

const dbName = (userId: string) => `spendless-lists-${userId}`;

export function openListsDb(userId: string): Promise<ListsDb> {
  return openDB<ListsDB>(dbName(userId), 1, {
    upgrade(db) {
      db.createObjectStore('lists', { keyPath: 'id' });
      db.createObjectStore('items', { keyPath: 'id' });
      db.createObjectStore('outbox', { keyPath: 'key' });
      db.createObjectStore('meta');
    },
  });
}

export const deleteListsDb = (userId: string) => deleteDB(dbName(userId));

/** Ask the browser not to evict our data under storage pressure (best effort). */
export async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persisted && !(await navigator.storage.persisted())) {
      await navigator.storage.persist?.();
    }
  } catch (error) {
    console.error('Error requesting persistent storage:', error);
  }
}

/** Monotonic sequence for outbox ordering, even within the same millisecond. */
let lastSeq = 0;
export const nextSeq = () => {
  lastSeq = Math.max(Date.now(), lastSeq + 1);
  return lastSeq;
};

/** RFC 4122 v4 id; works offline and on older browsers without randomUUID. */
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
