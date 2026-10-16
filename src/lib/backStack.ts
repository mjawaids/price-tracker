// Back that works like an app's: the phone's back button, the browser's back and the
// left-edge swipe close the last thing opened (a sheet, a screen, a tab other than
// Lists), one step at a time; on Lists with nothing open, back leaves the app.
//
// Each open "layer" owns one browser history entry above the page's own. The entries
// carry `sl` (their depth) and `slid` (this visit) next to React Router's state, and
// the URL never changes, so
// routing, the share target and the service worker see nothing new. Layers are the
// source of truth: history is brought in line with them after each change (in a
// microtask, so a sheet that remounts in the same tick doesn't move history at all).
// A back press lands on an entry of lower depth, and the layers above it close.

interface Layer {
  id: number;
  close: () => void;
}

let layers: Layer[] = [];
let histDepth = 0; // our entries above the page's own, as the browser has them
let traversing = false; // a history.go() we started hasn't landed yet
let scheduled = false;
let nextId = 1;
let started = false;
let session = ''; // this visit's id: entries from an earlier one are told apart by it
const listeners = new Set<() => void>();

const depthOf = (state: unknown) => {
  const sl = (state as { sl?: unknown } | null)?.sl;
  return typeof sl === 'number' && sl > 0 ? Math.floor(sl) : 0;
};

const sessionOf = (state: unknown) => {
  const id = (state as { slid?: unknown } | null)?.slid;
  return typeof id === 'string' ? id : null;
};

function notify() {
  listeners.forEach((fn) => fn());
}

function sync() {
  if (!started || traversing) return;
  if (histDepth < layers.length) {
    while (histDepth < layers.length) {
      histDepth += 1;
      window.history.pushState({ ...(window.history.state ?? {}), sl: histDepth, slid: session }, '');
    }
  } else if (histDepth > layers.length) {
    traversing = true;
    window.history.go(layers.length - histDepth);
  }
}

function schedule() {
  notify();
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    sync();
  });
}

function onPop(e: PopStateEvent) {
  const from = sessionOf(e.state);
  if (from && from !== session) {
    // An entry from an earlier visit (the app was left by a full page load and come
    // back to): it lies below this visit's own entry, where back leaves the app, so
    // keep going back, past that visit's entries and the one it opened on.
    traversing = true;
    window.history.go(-(depthOf(e.state) + 1));
    return;
  }
  histDepth = depthOf(e.state);
  if (traversing) {
    // Our own go() landed: catch up with anything that changed meanwhile.
    traversing = false;
    sync();
    return;
  }
  // Back (maybe several steps, from a long press on the browser's back): close
  // what's above where it landed, the top first.
  while (layers.length > histDepth) layers.pop()!.close();
  // Forward (or an entry left over from an earlier visit): nothing to reopen, so
  // step back to match.
  schedule();
}

/**
 * Starts listening; the entry the app opens on becomes depth 0 of a new visit (entries
 * an earlier visit left below it are skipped by back). Layers added before this (a
 * sheet open on launch: child effects run before the provider's) are kept.
 */
export function startBackStack() {
  if (started) return;
  started = true;
  histDepth = 0;
  traversing = false;
  session = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  window.history.replaceState({ ...(window.history.state ?? {}), sl: 0, slid: session }, '');
  window.addEventListener('popstate', onPop);
  schedule();
}

/** Stops listening and forgets the layers (the app's providers are going away). */
export function stopBackStack() {
  started = false;
  layers = [];
  window.removeEventListener('popstate', onPop);
  notify();
}

/** Something back should close: `close` runs when back reaches it. Returns its id. */
export function pushLayer(close: () => void): number {
  const id = nextId++;
  layers.push({ id, close });
  schedule();
  return id;
}

/** It closed some other way (its own button, Escape): drop its history entry. */
export function removeLayer(id: number) {
  const i = layers.findIndex((l) => l.id === id);
  if (i < 0) return;
  layers.splice(i, 1);
  schedule();
}

/** Forget every layer (a new tab root, sign-out). Their history entries go too. */
export function clearLayers() {
  if (!layers.length) return;
  layers = [];
  schedule();
}

/** Back from the app's own controls: closes the top layer. False when there is none. */
export function goBack(): boolean {
  const top = layers.pop();
  if (!top) return false;
  top.close();
  schedule();
  return true;
}

export const canGoBackInApp = () => layers.length > 0;

/** Re-render when the layers change (the edge swipe shows only when back can do something). */
export function subscribeBackStack(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
