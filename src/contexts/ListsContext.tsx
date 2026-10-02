import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { GroceryList, ListItem } from '../types';
import { openListsDb, deleteListsDb, requestPersistentStorage, newId, nextSeq, ListsDb, SyncTable } from '../lib/offline/db';
import { ListsSync, SyncStatus } from '../lib/offline/sync';
import { dictionaryCategory, dictionaryMatches, normalizeName } from '../lib/groceryDictionary';
import { parseQuickAdd, capitalize } from '../utils/quickAdd';

const DEFAULT_LIST_NAME = 'Groceries';
const FIRST_SYNC_WAIT_MS = 4000;
const PERIODIC_SYNC_MS = 60_000;

export interface Suggestion {
  name: string;
  category: string;
  fromHistory: boolean;
}

export interface AddResult {
  added: ListItem[];
  /** Items that were already on the list (quantity bumped or un-ticked). */
  merged: ListItem[];
}

interface ListsApi {
  ready: boolean;
  lists: GroceryList[];
  activeList: GroceryList | null;
  setActiveList: (id: string) => void;
  /** Visible items on the active list (not cleared). */
  items: ListItem[];
  todo: ListItem[];
  done: ListItem[];
  todoCountByList: Record<string, number>;
  addItems: (texts: string[]) => AddResult;
  toggle: (id: string) => ListItem | undefined;
  updateItem: (id: string, patch: Partial<Omit<ListItem, 'id' | 'listId'>>) => void;
  deleteItem: (id: string) => ListItem | undefined;
  clearDone: () => ListItem[];
  /** Put earlier snapshots back (undo). */
  restore: (snapshots: ListItem[]) => void;
  createList: (name: string) => GroceryList;
  renameList: (id: string, name: string) => void;
  deleteList: (id: string) => void;
  suggestions: (query: string, limit?: number) => Suggestion[];
  often: (limit?: number) => string[];
  hasHistory: boolean;
  categoryFor: (name: string) => string;
  syncStatus: SyncStatus;
  pending: number;
  online: boolean;
  /** Sign-out helper: try one last sync, then wipe this user's local data. */
  clearLocalData: () => Promise<void>;
}

const ListsContext = createContext<ListsApi | undefined>(undefined);

export const useLists = () => {
  const ctx = useContext(ListsContext);
  if (!ctx) throw new Error('useLists must be used within ListsProvider');
  return ctx;
};

const nowIso = () => new Date().toISOString();
const activeKey = (userId: string) => `spendless-active-list:${userId}`;
const byOrder = <T extends { sortOrder: number; createdAt: string }>(a: T, b: T) =>
  a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt);

export const ListsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [ready, setReady] = useState(false);
  const [lists, setLists] = useState<GroceryList[]>([]);
  const [allItems, setAllItems] = useState<ListItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);

  const dbRef = useRef<ListsDb | null>(null);
  const syncRef = useRef<ListsSync | null>(null);
  // Latest values for callbacks that must not go stale between renders.
  const itemsRef = useRef<ListItem[]>([]);
  const listsRef = useRef<GroceryList[]>([]);
  const activeRef = useRef<string | null>(null);
  itemsRef.current = allItems;
  listsRef.current = lists;
  activeRef.current = activeId;

  const reloadFromDb = useCallback(async () => {
    const db = dbRef.current;
    if (!db) return;
    const [ls, its] = await Promise.all([db.getAll('lists'), db.getAll('items')]);
    setLists(ls.filter((l) => !l.deletedAt).sort(byOrder));
    setAllItems(its.filter((i) => !i.deletedAt));
  }, []);

  /** Write rows locally, queue them for upload and nudge the sync engine. */
  const persist = useCallback(async (table: SyncTable, rows: (GroceryList | ListItem)[]) => {
    const db = dbRef.current;
    if (!db || !rows.length) return;
    try {
      const store = table === 'lists' ? 'lists' : 'items';
      const tx = db.transaction([store, 'outbox'], 'readwrite');
      for (const row of rows) {
        if (row.deletedAt) await tx.objectStore(store).delete(row.id);
        else await tx.objectStore(store).put(row as never);
        await tx.objectStore('outbox').put({ key: `${table}:${row.id}`, table, row, seq: nextSeq() });
      }
      await tx.done;
      setPending(await db.count('outbox'));
      syncRef.current?.schedule();
    } catch (error) {
      console.error('Error saving list change:', error);
    }
  }, []);

  const commitItems = useCallback(
    (rows: ListItem[]) => {
      if (!rows.length) return;
      const stamped = rows.map((r) => ({ ...r, updatedAt: nowIso() }));
      const ids = new Set(stamped.map((r) => r.id));
      setAllItems((cur) => [...cur.filter((i) => !ids.has(i.id)), ...stamped.filter((r) => !r.deletedAt)]);
      void persist('list_items', stamped);
    },
    [persist],
  );

  const commitLists = useCallback(
    (rows: GroceryList[]) => {
      if (!rows.length) return;
      const stamped = rows.map((r) => ({ ...r, updatedAt: nowIso() }));
      const ids = new Set(stamped.map((r) => r.id));
      setLists((cur) => [...cur.filter((l) => !ids.has(l.id)), ...stamped.filter((r) => !r.deletedAt)].sort(byOrder));
      void persist('lists', stamped);
    },
    [persist],
  );

  const makeList = useCallback(
    (name: string): GroceryList => {
      const t = nowIso();
      const maxOrder = listsRef.current.reduce((m, l) => Math.max(m, l.sortOrder), 0);
      const list: GroceryList = {
        id: newId(), name: name.trim().slice(0, 60) || DEFAULT_LIST_NAME, sortOrder: maxOrder + 1,
        createdAt: t, updatedAt: t, deletedAt: null,
      };
      commitLists([list]);
      return list;
    },
    [commitLists],
  );

  // ── Open the user's local store, start syncing, make sure a list exists ──────
  useEffect(() => {
    if (!userId) {
      setReady(false);
      setLists([]);
      setAllItems([]);
      setActiveId(null);
      return;
    }
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    const report = (status: SyncStatus, n: number) => {
      if (cancelled) return;
      setSyncStatus(status);
      setPending(n);
    };

    const onOnline = () => {
      setOnline(true);
      void syncRef.current?.run();
    };
    const onOffline = () => {
      setOnline(false);
      setSyncStatus('offline');
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void syncRef.current?.run();
    };

    (async () => {
      try {
        const db = await openListsDb(userId);
        if (cancelled) return db.close();
        dbRef.current = db;
        void requestPersistentStorage();
        try {
          setActiveId(localStorage.getItem(activeKey(userId)));
        } catch (error) {
          console.error('Error reading active list:', error);
        }
        await reloadFromDb();
        const hadLocal = (await db.count('lists')) > 0;
        if (hadLocal && !cancelled) setReady(true);

        const sync = new ListsSync(db, userId, () => void reloadFromDb(), report);
        syncRef.current = sync;
        const first = sync.run();
        // New device: give the first pull a moment so we don't create a duplicate list.
        if (!hadLocal) await Promise.race([first, new Promise((r) => setTimeout(r, FIRST_SYNC_WAIT_MS))]);
        if (cancelled) return;
        if (!(await db.getAll('lists')).some((l) => !l.deletedAt)) makeList(DEFAULT_LIST_NAME);
        setReady(true);

        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);
        document.addEventListener('visibilitychange', onVisible);
        interval = setInterval(() => {
          if (document.visibilityState === 'visible') void sync.run();
        }, PERIODIC_SYNC_MS);
      } catch (error) {
        console.error('Error opening lists storage:', error);
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
      syncRef.current?.stop();
      syncRef.current = null;
      dbRef.current?.close();
      dbRef.current = null;
      if (interval) clearInterval(interval);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [userId, reloadFromDb, makeList]);

  const activeList = useMemo(
    () => lists.find((l) => l.id === activeId) || lists[0] || null,
    [lists, activeId],
  );
  const activeListId = activeList?.id ?? null;

  const setActiveList = useCallback(
    (id: string) => {
      setActiveId(id);
      if (!userId) return;
      try {
        localStorage.setItem(activeKey(userId), id);
      } catch (error) {
        console.error('Error saving active list:', error);
      }
    },
    [userId],
  );

  const items = useMemo(
    () => allItems.filter((i) => i.listId === activeListId && !i.clearedAt).sort(byOrder),
    [allItems, activeListId],
  );
  const todo = useMemo(() => items.filter((i) => !i.done), [items]);
  const done = useMemo(
    () => items.filter((i) => i.done).sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || '')),
    [items],
  );
  const todoCountByList = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const i of allItems) if (!i.done && !i.clearedAt) counts[i.listId] = (counts[i.listId] || 0) + 1;
    return counts;
  }, [allItems]);

  // History across all lists (incl. cleared items) powers suggestions + categories.
  const history = useMemo(() => {
    const map = new Map<string, { name: string; count: number; lastAt: string; category: string | null }>();
    for (const i of allItems) {
      const key = normalizeName(i.name);
      const prev = map.get(key);
      const newer = !prev || i.updatedAt > prev.lastAt;
      map.set(key, {
        name: newer ? i.name : prev!.name,
        count: (prev?.count || 0) + 1,
        lastAt: newer ? i.updatedAt : prev!.lastAt,
        category: newer ? i.category : prev!.category,
      });
    }
    return map;
  }, [allItems]);
  const historyRef = useRef(history);
  historyRef.current = history;

  const categoryFor = useCallback(
    (name: string) => historyRef.current.get(normalizeName(name))?.category || dictionaryCategory(name) || 'other',
    [],
  );

  const openNames = useMemo(() => new Set(todo.map((i) => normalizeName(i.name))), [todo]);

  const addItems = useCallback(
    (texts: string[]): AddResult => {
      const listId = activeRef.current && listsRef.current.some((l) => l.id === activeRef.current)
        ? activeRef.current
        : listsRef.current[0]?.id;
      const result: AddResult = { added: [], merged: [] };
      if (!listId) return result;

      const working = itemsRef.current.filter((i) => i.listId === listId && !i.clearedAt);
      const changes = new Map<string, ListItem>();
      let order = Date.now();
      for (const text of texts) {
        const p = parseQuickAdd(text);
        if (!p) continue;
        const key = normalizeName(p.name);
        const existing =
          [...changes.values()].find((i) => normalizeName(i.name) === key) ||
          working.find((i) => normalizeName(i.name) === key);
        if (existing) {
          const merged: ListItem = existing.done
            ? { ...existing, done: false, doneAt: null, quantity: p.quantity, unit: p.unit ?? existing.unit }
            : {
                ...existing,
                quantity: (existing.quantity ?? 1) + (p.quantity ?? 1),
                unit: p.unit ?? existing.unit,
              };
          changes.set(merged.id, merged);
          result.merged = [...result.merged.filter((m) => m.id !== merged.id), merged];
          continue;
        }
        const t = nowIso();
        const item: ListItem = {
          id: newId(), listId, name: p.name, quantity: p.quantity, unit: p.unit, note: null,
          category: categoryFor(p.name), done: false, doneAt: null, clearedAt: null,
          sortOrder: order++, productId: null, createdAt: t, updatedAt: t, deletedAt: null,
        };
        changes.set(item.id, item);
        result.added.push(item);
      }
      commitItems([...changes.values()]);
      return result;
    },
    [categoryFor, commitItems],
  );

  const findItem = useCallback((id: string) => itemsRef.current.find((i) => i.id === id), []);

  const toggle = useCallback(
    (id: string) => {
      const prev = findItem(id);
      if (!prev) return undefined;
      const doneNow = !prev.done;
      commitItems([{ ...prev, done: doneNow, doneAt: doneNow ? nowIso() : null }]);
      return prev;
    },
    [commitItems, findItem],
  );

  const updateItem = useCallback(
    (id: string, patch: Partial<Omit<ListItem, 'id' | 'listId'>>) => {
      const prev = findItem(id);
      if (!prev) return;
      const next = { ...prev, ...patch };
      if (typeof next.name === 'string') next.name = capitalize(next.name.slice(0, 120));
      commitItems([next]);
    },
    [commitItems, findItem],
  );

  const deleteItem = useCallback(
    (id: string) => {
      const prev = findItem(id);
      if (!prev) return undefined;
      commitItems([{ ...prev, deletedAt: nowIso() }]);
      return prev;
    },
    [commitItems, findItem],
  );

  const clearDone = useCallback(() => {
    const listId = activeListId;
    const prev = itemsRef.current.filter((i) => i.listId === listId && i.done && !i.clearedAt);
    const t = nowIso();
    commitItems(prev.map((i) => ({ ...i, clearedAt: t })));
    return prev;
  }, [activeListId, commitItems]);

  const restore = useCallback(
    (snapshots: ListItem[]) => commitItems(snapshots.map((s) => ({ ...s, deletedAt: null }))),
    [commitItems],
  );

  const renameList = useCallback(
    (id: string, name: string) => {
      const prev = listsRef.current.find((l) => l.id === id);
      const clean = name.trim().slice(0, 60);
      if (prev && clean) commitLists([{ ...prev, name: clean }]);
    },
    [commitLists],
  );

  const deleteList = useCallback(
    (id: string) => {
      const prev = listsRef.current.find((l) => l.id === id);
      if (!prev) return;
      const t = nowIso();
      commitItems(itemsRef.current.filter((i) => i.listId === id).map((i) => ({ ...i, deletedAt: t })));
      commitLists([{ ...prev, deletedAt: t }]);
      if (listsRef.current.length <= 1) makeList(DEFAULT_LIST_NAME);
    },
    [commitItems, commitLists, makeList],
  );

  const suggestions = useCallback(
    (query: string, limit = 5): Suggestion[] => {
      const p = parseQuickAdd(query);
      const q = p ? normalizeName(p.name) : '';
      if (!q) return [];
      const fromHistory = [...history.entries()]
        .filter(([key]) => key.includes(q) && !openNames.has(key))
        .sort(([a, x], [b, y]) => Number(!a.startsWith(q)) - Number(!b.startsWith(q)) || y.count - x.count)
        .map(([, h]) => ({ name: h.name, category: h.category || dictionaryCategory(h.name) || 'other', fromHistory: true }));
      const seen = new Set(fromHistory.map((s) => normalizeName(s.name)));
      const fromDictionary = dictionaryMatches(q, limit * 2)
        .filter((n) => !seen.has(n) && !openNames.has(n))
        .map((n) => ({ name: capitalize(n), category: dictionaryCategory(n) || 'other', fromHistory: false }));
      return [...fromHistory, ...fromDictionary].slice(0, limit);
    },
    [history, openNames],
  );

  const often = useCallback(
    (limit = 8) =>
      [...history.entries()]
        .filter(([key]) => !openNames.has(key))
        .sort(([, a], [, b]) => b.count - a.count || b.lastAt.localeCompare(a.lastAt))
        .slice(0, limit)
        .map(([, h]) => h.name),
    [history, openNames],
  );

  const clearLocalData = useCallback(async () => {
    if (!userId) return;
    try {
      await syncRef.current?.run();
    } catch (error) {
      console.error('Final lists sync failed:', error);
    }
    syncRef.current?.stop();
    syncRef.current = null;
    dbRef.current?.close();
    dbRef.current = null;
    try {
      localStorage.removeItem(activeKey(userId));
      await deleteListsDb(userId);
    } catch (error) {
      console.error('Error clearing local lists:', error);
    }
  }, [userId]);

  const api: ListsApi = {
    ready,
    lists,
    activeList,
    setActiveList,
    items,
    todo,
    done,
    todoCountByList,
    addItems,
    toggle,
    updateItem,
    deleteItem,
    clearDone,
    restore,
    createList: makeList,
    renameList,
    deleteList,
    suggestions,
    often,
    hasHistory: history.size > 0,
    categoryFor,
    syncStatus: online || syncStatus === 'local' ? syncStatus : 'offline',
    pending,
    online,
    clearLocalData,
  };

  return <ListsContext.Provider value={api}>{children}</ListsContext.Provider>;
};
