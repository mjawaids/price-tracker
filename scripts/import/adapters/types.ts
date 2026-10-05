// What a store adapter gets and returns.
import type { PoliteClient } from '../http.ts';
import type { RawListing } from '../normalize.ts';

/** What we already know about a store's listings (empty on a dry run). */
export interface KnownListing {
  url: string | null;
  included: boolean;
  active: boolean;
  checkedAt: string;
  /** The store's name for it and its aisle path ("A › B › C"), as last seen. */
  sourceName: string | null;
  sourceCategory: string | null;
}

export interface AdapterContext {
  http: PoliteClient;
  log: (s: string) => void;
  /** Most page requests this run may make for the store. */
  maxPages: number;
  /** Stop reading at this time (ms since epoch), keeping what was read, so the job never times out. */
  deadline: number;
  known: Map<string, KnownListing>;
}

export interface AdapterResult {
  listings: RawListing[];
  /** External ids the store no longer lists (e.g. product page 404). */
  gone: string[];
  /** True when the whole catalogue was read, so anything unseen is gone. */
  full: boolean;
  status: 'ok' | 'partial' | 'blocked';
  note?: string;
}
