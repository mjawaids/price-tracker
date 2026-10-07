// What was shared to SpendLess from another app ("Share to SpendLess"): the service
// worker (public/share-target-sw.js) keeps it in a cache on this device; this reads it
// once, for the "Read this receipt?" sheet, and deletes it. Kept for 30 minutes at
// most (long enough to sign in first). A module store, in the main bundle: tiny.
// App-only.
import { useSyncExternalStore } from 'react';

const INBOX = 'spendless-share-inbox';
const META = '/share-inbox/meta.json';
const TTL_MS = 30 * 60 * 1000;
const MAX_TEXT = 20_000;

export interface SharedSummary {
  /** Files waiting, by kind. */
  images: number;
  pdfs: number;
  hasText: boolean;
}

export interface SharedReceipt {
  files: File[];
  text: string | null;
}

interface Meta {
  at: number;
  files: { type: string; size: number }[];
  text: string;
}

/** How the app was opened: /?share=receipt (something arrived) or /?share=failed. */
export const shareParam: string | null = (() => {
  try {
    return new URLSearchParams(window.location.search).get('share');
  } catch {
    return null;
  }
})();

let waiting: SharedSummary | null = null;
const listeners = new Set<() => void>();
const set = (v: SharedSummary | null) => {
  waiting = v;
  listeners.forEach((fn) => fn());
};

const supported = () => typeof caches !== 'undefined';

async function readMeta(): Promise<Meta | null> {
  if (!supported() || !(await caches.has(INBOX))) return null;
  const inbox = await caches.open(INBOX);
  const res = await inbox.match(META);
  if (!res) return null;
  const meta = (await res.json()) as Meta;
  if (typeof meta?.at !== 'number' || !Array.isArray(meta.files) || Date.now() - meta.at > TTL_MS) {
    await clearShared();
    return null;
  }
  return meta;
}

/** Look for something shared (doesn't delete it): what the sheet shows. */
export async function peekShared(): Promise<SharedSummary | null> {
  try {
    const meta = await readMeta();
    const summary = meta
      ? {
          images: meta.files.filter((f) => f.type.startsWith('image/')).length,
          pdfs: meta.files.filter((f) => f.type === 'application/pdf').length,
          hasText: !!meta.text?.trim(),
        }
      : null;
    set(summary && (summary.images || summary.pdfs || summary.hasText) ? summary : null);
    return waiting;
  } catch (error) {
    console.error('Reading a shared receipt failed:', error instanceof Error ? error.message : error);
    return null;
  }
}

/** Take what was shared (files with plain names, text) and delete it from the device. */
export async function takeShared(): Promise<SharedReceipt | null> {
  try {
    const meta = await readMeta();
    if (!meta) return null;
    const inbox = await caches.open(INBOX);
    const files: File[] = [];
    for (let i = 0; i < meta.files.length; i++) {
      const res = await inbox.match(`/share-inbox/${i}`);
      if (!res) continue;
      const blob = await res.blob();
      const type = meta.files[i].type;
      const ext = type === 'application/pdf' ? 'pdf' : (type.split('/')[1] ?? 'jpg');
      files.push(new File([blob], `shared-${i + 1}.${ext}`, { type }));
    }
    await clearShared();
    return { files, text: typeof meta.text === 'string' && meta.text.trim() ? meta.text.slice(0, MAX_TEXT) : null };
  } catch (error) {
    console.error('Reading a shared receipt failed:', error instanceof Error ? error.message : error);
    await clearShared();
    return null;
  }
}

/** Forget what was shared ("Not now", sign-out). */
export async function clearShared(): Promise<void> {
  set(null);
  try {
    if (supported()) await caches.delete(INBOX);
  } catch {
    /* nothing to delete */
  }
}

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const get = () => waiting;

/** What's waiting to be read (null = nothing). */
export const useShared = () => useSyncExternalStore(subscribe, get, get);
