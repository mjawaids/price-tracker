// "Install the app" support (PWA). Works the same signed in or out.
//
// Chromium browsers (Chrome, Edge, Samsung Internet, Opera…) fire
// `beforeinstallprompt` when the app can be installed; we keep that event so a
// button can open the browser's install dialog later. It fires again after the
// app is uninstalled, so "install again" works with the same button.
// Safari (iPhone/iPad/Mac) and Firefox never fire it, so for those we show the
// browser's own steps instead (Share → Add to Home Screen, File → Add to Dock…).
//
// Imported from src/main.tsx before React renders so the event is never missed.
import { useSyncExternalStore } from 'react';
import { trackEvent } from '../utils/analytics';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallPlatform =
  | 'ios' // iPhone / iPad, any browser: Share → Add to Home Screen
  | 'mac-safari' // Safari on macOS: File → Add to Dock
  | 'android' // Android browser without an install prompt: menu → Install / Add to Home screen
  | 'desktop' // Chromium on a computer: install icon in the address bar / menu
  | 'other'; // e.g. Firefox on a computer: suggest another browser

export interface InstallState {
  /** Running as the installed app (home screen / dock / app window). */
  standalone: boolean;
  /** The browser's own install dialog can be opened with promptInstall(). */
  canPrompt: boolean;
  /** This browser has installed the app before and hasn't offered to install it since. */
  installed: boolean;
  platform: InstallPlatform;
  /** The install banner was closed with "Not now" recently. */
  bannerSnoozed: boolean;
}

const INSTALLED_KEY = 'spendless:installed';

const readFlag = () => {
  try {
    return localStorage.getItem(INSTALLED_KEY) === '1';
  } catch {
    return false;
  }
};
const writeFlag = (on: boolean) => {
  try {
    if (on) localStorage.setItem(INSTALLED_KEY, '1');
    else localStorage.removeItem(INSTALLED_KEY);
  } catch {
    // Storage blocked (private mode) — the flag is only a hint.
  }
};

const DISPLAY_MODES = ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay'];

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  // iOS Safari's home-screen apps report this instead of display-mode.
  if ((navigator as Navigator & { standalone?: boolean }).standalone === true) return true;
  return DISPLAY_MODES.some((m) => window.matchMedia?.(`(display-mode: ${m})`).matches);
}

function detectPlatform(): InstallPlatform {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac; touch support gives it away.
  const iOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (iOS) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  if (/Macintosh/.test(ua) && /Safari\//.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|Firefox/.test(ua)) return 'mac-safari';
  if (/Chrome|Chromium|Edg\//.test(ua) && !/Firefox/.test(ua)) return 'desktop';
  return 'other';
}

// ── Install banner: shown once in a while until installed ────────────────────
const BANNER_KEY = 'spendless:install-banner-dismissed-at';
/** After "Not now", ask again only after this long. */
const BANNER_SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

function readBannerSnoozed(): boolean {
  try {
    return Date.now() - Number(localStorage.getItem(BANNER_KEY) || 0) < BANNER_SNOOZE_MS;
  } catch {
    return false;
  }
}

/** The banner shows only where installing is a tap or two away (Chromium offer, iPhone/iPad). */
export const bannerVisible = (s: InstallState) =>
  !s.standalone && !s.installed && !s.bannerSnoozed && (s.canPrompt || s.platform === 'ios');

let deferred: BeforeInstallPromptEvent | null = null;
let state: InstallState = {
  standalone: isStandalone(),
  canPrompt: false,
  installed: readFlag(),
  platform: detectPlatform(),
  bannerSnoozed: readBannerSnoozed(),
};
if (state.standalone && !state.installed) {
  state = { ...state, installed: true };
  writeFlag(true);
}

const listeners = new Set<() => void>();
const set = (patch: Partial<InstallState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Keep the event for our own Install button instead of the browser's mini-infobar.
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    // The browser only offers this when the app isn't installed, so a stale
    // "installed" flag (the user removed the app) is cleared here.
    writeFlag(false);
    set({ canPrompt: true, installed: false });
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    writeFlag(true);
    set({ canPrompt: false, installed: true });
    trackEvent('app_installed', 'pwa');
  });
  window.matchMedia?.('(display-mode: standalone)').addEventListener?.('change', () => set({ standalone: isStandalone() }));
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const snapshot = () => state;

export function useInstall(): InstallState {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/**
 * Opens the browser's install dialog (Chromium only). Resolves to what the
 * user chose, or 'unavailable' when the browser hasn't offered an install.
 */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const ev = deferred;
  if (!ev) return 'unavailable';
  // An install event can be used only once.
  deferred = null;
  set({ canPrompt: false });
  try {
    await ev.prompt();
    const { outcome } = await ev.userChoice;
    trackEvent('install_prompt', 'pwa', outcome);
    return outcome;
  } catch (error) {
    console.error('Install prompt failed:', error);
    return 'unavailable';
  }
}

export function snoozeBanner() {
  try {
    localStorage.setItem(BANNER_KEY, String(Date.now()));
  } catch {
    // Storage blocked — the banner simply comes back next visit.
  }
  set({ bannerSnoozed: true });
}
