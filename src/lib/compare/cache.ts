// On-device copy of the Compare data a user sees (app only), so "Where to buy"
// opens instantly and works offline from the last prices. One IndexedDB per user,
// deleted on sign-out. Values are whole snapshots; the context merges deltas.
import { openDB, deleteDB, DBSchema, IDBPDatabase } from 'idb';
import type { CatalogProduct, CatalogStore, CurrentPrice, ItemPreference, Region } from './types';
import type { PlanRecord } from './api';

export interface CatalogSnapshot {
  regions: Region[];
  stores: CatalogStore[];
  products: CatalogProduct[];
  prices: CurrentPrice[];
  ownReports: CurrentPrice[];
  preferences: ItemPreference[];
  myStores: string[];
  plans: PlanRecord[];
  /** Region the prices were loaded for, the delta cursor, and when we last did a full load. */
  regionId: string | null;
  cursor: string | null;
  fullAt: number;
  syncedAt: string | null;
}

interface CatalogDB extends DBSchema {
  kv: { key: string; value: CatalogSnapshot };
}

const dbName = (userId: string) => `spendless-catalog-${userId}`;
const KEY = 'snapshot';

const open = (userId: string): Promise<IDBPDatabase<CatalogDB>> =>
  openDB<CatalogDB>(dbName(userId), 1, {
    upgrade(db) {
      db.createObjectStore('kv');
    },
  });

export async function readSnapshot(userId: string): Promise<CatalogSnapshot | null> {
  try {
    const db = await open(userId);
    const snap = (await db.get('kv', KEY)) ?? null;
    db.close();
    return snap;
  } catch (error) {
    console.error('Error reading the Compare cache:', error);
    return null;
  }
}

export async function writeSnapshot(userId: string, snap: CatalogSnapshot): Promise<void> {
  try {
    const db = await open(userId);
    await db.put('kv', snap, KEY);
    db.close();
  } catch (error) {
    console.error('Error saving the Compare cache:', error);
  }
}

export async function deleteSnapshot(userId: string): Promise<void> {
  try {
    await deleteDB(dbName(userId));
  } catch (error) {
    console.error('Error clearing the Compare cache:', error);
  }
}
