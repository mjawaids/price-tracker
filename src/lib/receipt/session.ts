// The receipt being added, kept in memory while the app is open (never stored): what
// was read, the user's edits and where they're up to. A module store like
// src/lib/install.ts, so reading carries on when the user leaves the screen and the
// review is still there when they come back. Type-only imports keep it tiny: the
// update prompt and sign-out use it from the main bundle. App-only.
import { useSyncExternalStore } from 'react';
import type { ReadProgress } from './ocr.ts';
import type { ParsedReceipt } from './parse.ts';
import type { PdfProblem } from './pdf.ts';
import type { StoreGuess } from './stores.ts';
import type { TextLine } from './text.ts';

export type ReceiptSource = 'image' | 'photo' | 'pdf' | 'text';
/** nothing = no items found · image = couldn't open a picture · pdf = couldn't open a PDF · reader = the reader failed to load or run */
export type ReadFailure = 'nothing' | 'image' | 'pdf' | 'reader';

/** What the user changed on one line (keyed by the item's id). */
export interface RowEdit {
  productId?: string;
  include?: boolean;
  /** Price for one. */
  unitPrice?: number;
  quantity?: number;
  notProduct?: boolean;
  /** Remember this choice for the chain (on unless turned off). */
  remember?: boolean;
}

export interface SavedReceipt {
  storeId: string;
  /** Report ids (for Undo). */
  ids: string[];
  productIds: string[];
  accepted: number;
  pending: number;
  remembered: number;
  medicines: number;
  /** Saved for the user only: medicines and their own products. */
  onlyYou: number;
  /** Lines read but not saved. */
  skipped: number;
  /** YYYY-MM-DD the prices were saved for. */
  date: string;
}

export type ReceiptStep =
  | { name: 'start' }
  /** The reader must be downloaded first (pictures, or a scanned PDF): ask once. */
  | { name: 'consent'; files: File[]; source: ReceiptSource; kind: 'image' | 'pdf' }
  | { name: 'reading'; count: number; progress: ReadProgress | null; adding: boolean }
  | { name: 'failed'; reason: ReadFailure; problem?: PdfProblem }
  | { name: 'review' }
  | { name: 'saved'; saved: SavedReceipt };

export interface ReceiptState {
  /** Bumped on every new read or reset, so a read that finishes late is dropped. */
  run: number;
  step: ReceiptStep;
  source: ReceiptSource | null;
  lines: TextLine[];
  parsed: ParsedReceipt | null;
  guess: StoreGuess | null;
  storeId: string | null;
  /** The store was looked up from the guess (or asked for) once. */
  storeLooked: boolean;
  /** YYYY-MM-DD chosen by the user; null = the date read from the receipt (or today). */
  date: string | null;
  edits: Record<string, RowEdit>;
  /** Adding another picture to this receipt failed (the review is kept). */
  addFailed: boolean;
  /** Pages or pictures over the limit that weren't read (the review says so). */
  skipped: number;
  /** Files read with others that looked like a separate receipt, so weren't added (the review says so). */
  separate: number;
}

const blank = (run: number): ReceiptState => ({
  run,
  step: { name: 'start' },
  source: null,
  lines: [],
  parsed: null,
  guess: null,
  storeId: null,
  storeLooked: false,
  date: null,
  edits: {},
  addFailed: false,
  skipped: 0,
  separate: 0,
});

let state = blank(0);
let cancel: (() => void) | null = null;
const listeners = new Set<() => void>();

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const getReceipt = () => state;

export function setReceipt(patch: Partial<ReceiptState> | ((s: ReceiptState) => Partial<ReceiptState>)) {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
  listeners.forEach((fn) => fn());
}

/** Start a new run (a fresh read); returns its number. */
export function nextRun(): number {
  setReceipt({ run: state.run + 1 });
  return state.run;
}

/** What stops the read in progress (null when none). */
export function onCancel(fn: (() => void) | null) {
  cancel = fn;
}

/** Drop the receipt (and stop any read in progress). Also used on sign-out. */
export function resetReceipt() {
  const stop = cancel;
  cancel = null;
  state = blank(state.run + 1);
  stop?.();
  listeners.forEach((fn) => fn());
}

export const useReceipt = () => useSyncExternalStore(subscribe, getReceipt, getReceipt);

/** A receipt is being read or reviewed (or waits for the reader): don't reload the app under it. */
export const isReviewOpen = () => ['consent', 'reading', 'review'].includes(state.step.name);
