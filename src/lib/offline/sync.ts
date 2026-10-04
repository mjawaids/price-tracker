// Two-way sync between the on-device Lists store and Supabase.
//
// - Every local change is written to IndexedDB and queued in `outbox` as a full-row
//   upsert (deletes are upserts with `deleted_at`), so it survives reloads offline.
// - flush() sends the outbox (lists before items, oldest first); pull() fetches rows
//   changed on the server since the last cursor (server-set `updated_at`).
// - Conflicts: last write wins per row. A row with an unsent local change is never
//   overwritten by a pull.
import { supabase, isSupabaseReady } from '../supabase';
import { GroceryList, ListItem } from '../../types';
import { ListsDb, OutboxEntry, SyncTable } from './db';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error' | 'local';

type Row = Record<string, unknown>;

const TABLES: SyncTable[] = ['lists', 'list_items'];
const STORE: Record<SyncTable, 'lists' | 'items'> = { lists: 'lists', list_items: 'items' };
const PAGE = 500;
const PUSH_CHUNK = 200;
const CURSOR_OVERLAP_MS = 5000;
const MAX_BACKOFF_MS = 5 * 60 * 1000;

function toRow(table: SyncTable, r: GroceryList | ListItem, userId: string): Row {
  if (table === 'lists') {
    const l = r as GroceryList;
    return {
      id: l.id, user_id: userId, name: l.name, sort_order: l.sortOrder,
      created_at: l.createdAt, updated_at: l.updatedAt, deleted_at: l.deletedAt,
    };
  }
  const i = r as ListItem;
  return {
    id: i.id, list_id: i.listId, user_id: userId, name: i.name, quantity: i.quantity, unit: i.unit,
    note: i.note, category: i.category, done: i.done, done_at: i.doneAt, cleared_at: i.clearedAt,
    sort_order: i.sortOrder, product_id: i.productId, plan_store_id: i.planStoreId ?? null,
    plan_product_id: i.planProductId ?? null, plan_price: i.planPrice ?? null, created_at: i.createdAt,
    updated_at: i.updatedAt, deleted_at: i.deletedAt,
  };
}

const str = (v: unknown) => (v == null ? null : String(v));

function fromRow(table: SyncTable, r: Row): GroceryList | ListItem {
  if (table === 'lists') {
    return {
      id: String(r.id), name: String(r.name), sortOrder: Number(r.sort_order) || 0,
      createdAt: String(r.created_at), updatedAt: String(r.updated_at), deletedAt: str(r.deleted_at),
    };
  }
  return {
    id: String(r.id), listId: String(r.list_id), name: String(r.name),
    quantity: r.quantity == null ? null : Number(r.quantity), unit: str(r.unit), note: str(r.note),
    category: str(r.category), done: !!r.done, doneAt: str(r.done_at), clearedAt: str(r.cleared_at),
    sortOrder: Number(r.sort_order) || 0, productId: str(r.product_id), planStoreId: str(r.plan_store_id),
    planProductId: str(r.plan_product_id), planPrice: r.plan_price == null ? null : Number(r.plan_price),
    createdAt: String(r.created_at), updatedAt: String(r.updated_at), deletedAt: str(r.deleted_at),
  };
}

/** Bad data (constraint/type errors) will never succeed on retry; anything else might. */
const isPermanent = (error: { code?: string }) => /^2[23]/.test(error.code || '');

export class ListsSync {
  private running = false;
  private again = false;
  private backoff = 0;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;

  constructor(
    private db: ListsDb,
    private userId: string,
    private onRemoteChange: () => void,
    private onStatus: (status: SyncStatus, pending: number) => void,
  ) {}

  stop() {
    this.stopped = true;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.retryTimer) clearTimeout(this.retryTimer);
  }

  /** Run soon, coalescing bursts of local edits into one round trip. */
  schedule(delay = 500) {
    if (this.stopped) return;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => void this.run(), delay);
  }

  async pending() {
    return this.db.count('outbox');
  }

  async run(): Promise<void> {
    if (this.stopped) return;
    if (this.running) {
      this.again = true;
      return;
    }
    if (!isSupabaseReady) return this.onStatus('local', await this.pending());
    if (typeof navigator !== 'undefined' && !navigator.onLine) return this.onStatus('offline', await this.pending());

    this.running = true;
    this.onStatus('syncing', await this.pending());
    try {
      // Without a live session RLS would reject every row — wait until signed in.
      const { data } = await supabase.auth.getSession();
      if (!data?.session) {
        this.onStatus('offline', await this.pending());
        return;
      }
      await this.flush();
      await this.pull();
      this.backoff = 0;
      this.onStatus('synced', await this.pending());
    } catch (error) {
      console.error('Lists sync failed:', error);
      this.backoff = Math.min(Math.max(2000, this.backoff * 2), MAX_BACKOFF_MS);
      if (this.retryTimer) clearTimeout(this.retryTimer);
      this.retryTimer = setTimeout(() => void this.run(), this.backoff);
      const offline = typeof navigator !== 'undefined' && !navigator.onLine;
      this.onStatus(offline ? 'offline' : 'error', await this.pending());
    } finally {
      this.running = false;
      if (this.again) {
        this.again = false;
        this.schedule(0);
      }
    }
  }

  private async ack(entry: OutboxEntry) {
    const tx = this.db.transaction('outbox', 'readwrite');
    const current = await tx.store.get(entry.key);
    // Only drop it if it wasn't edited again while the request was in flight.
    if (current && current.seq === entry.seq) await tx.store.delete(entry.key);
    await tx.done;
  }

  private async upsert(table: SyncTable, entries: OutboxEntry[]) {
    return supabase.from(table).upsert(entries.map((e) => toRow(table, e.row, this.userId)));
  }

  private async flush() {
    const all = (await this.db.getAll('outbox')).sort((a, b) => a.seq - b.seq);
    for (const table of TABLES) {
      const entries = all.filter((e) => e.table === table);
      for (let i = 0; i < entries.length; i += PUSH_CHUNK) {
        const chunk = entries.slice(i, i + PUSH_CHUNK);
        const { error } = await this.upsert(table, chunk);
        if (!error) {
          for (const e of chunk) await this.ack(e);
          continue;
        }
        if (!isPermanent(error)) throw error;
        // One bad row shouldn't block the rest: retry individually, drop only bad rows.
        for (const e of chunk) {
          let { error: rowError } = await this.upsert(table, [e]);
          // A plan or pinned product pointing at something deleted (foreign key): keep the
          // user's change, drop just those links.
          if (rowError?.code === '23503' && table === 'list_items') {
            const unlinked = { ...(e.row as ListItem), productId: null, planStoreId: null, planProductId: null, planPrice: null };
            ({ error: rowError } = await this.upsert(table, [{ ...e, row: unlinked }]));
          }
          if (!rowError) await this.ack(e);
          else if (isPermanent(rowError)) {
            console.error('Dropping a list change the server rejected:', rowError.code);
            await this.ack(e);
          } else throw rowError;
        }
      }
    }
  }

  private async pull() {
    let changed = false;
    for (const table of TABLES) {
      const cursorKey = `cursor:${table}`;
      const cursor = await this.db.get('meta', cursorKey);
      let since = cursor ? new Date(Date.parse(cursor) - CURSOR_OVERLAP_MS).toISOString() : null;
      let newest = cursor || '';

      for (;;) {
        let query = supabase.from(table).select('*').order('updated_at', { ascending: true }).limit(PAGE);
        query = since ? query.gt('updated_at', since) : query.is('deleted_at', null);
        const { data, error } = await query;
        if (error) throw error;
        const rows = (data || []) as Row[];
        if (!rows.length) break;

        const store = STORE[table];
        const tx = this.db.transaction([store, 'outbox'], 'readwrite');
        for (const row of rows) {
          const id = String(row.id);
          if (await tx.objectStore('outbox').get(`${table}:${id}`)) continue;
          if (row.deleted_at) await tx.objectStore(store).delete(id);
          else await tx.objectStore(store).put(fromRow(table, row) as never);
        }
        await tx.done;
        changed = true;

        const last = String(rows[rows.length - 1].updated_at);
        if (last > newest) newest = last;
        if (rows.length < PAGE) break;
        since = last;
      }
      if (newest && newest !== cursor) await this.db.put('meta', newest, cursorKey);
    }
    if (changed) this.onRemoteChange();
  }
}
