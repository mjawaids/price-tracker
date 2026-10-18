/* OneSignal Web SDK v16 wrapper, for still-to-buy reminders (src/lib/push.ts holds
   the account side). Ported from DailyWins.

   The SDK is imported lazily so that signed-out visitors and the legal pages never
   pay for it, and so init() can never run without a session. It loads its scripts
   from cdn.onesignal.com: the one CDN exception (CLAUDE.md → Security).

   Security note: the Web SDK has no Identity Verification (that feature is
   mobile-SDK-only), so anyone can call OneSignal.login('<id>') from the console
   and start receiving that id's pushes. We therefore log in with the opaque
   `push_alias` from spendless.push_settings rather than the Supabase user id, and
   the reminder says only how many things are left. See migration
   20261017120000_push_reminders.sql. */

import type OneSignalType from 'react-onesignal';

export type PushState =
  | 'unsupported' // no Notification/PushManager — includes iOS Safari in a tab
  | 'blocked' // browser can do push, but the OneSignal SDK failed to load (content blocker, e.g. Brave Shields)
  | 'default' // never asked
  | 'denied' // blocked at the browser level; cannot re-prompt
  | 'granted-off' // permission granted, but opted out of this app
  | 'granted-on';

const APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID as string | undefined;

/** A blocked <script> tag never fires anything we can await, so without a cap
    the toggle would sit on "Enabling…" forever. 10s is long enough for a slow
    mobile connection to fetch the SDK, but short enough that the user still
    gets an answer. Being wrong is cheap either way, because a load that finishes
    after the cap is still adopted (see initOneSignal). */
const INIT_TIMEOUT_MS = 10_000;

let sdk: typeof OneSignalType | null = null;
let initPromise: Promise<boolean> | null = null;
/* Set when the SDK could not be loaded. The usual cause is a content blocker —
   Brave Shields, uBlock Origin and the like block cdn.onesignal.com and
   api.onesignal.com — so the UI must say "blocked" rather than "unsupported":
   the user CAN fix it, by allowing this site. */
let sdkBlocked = false;
const listeners = new Set<(s: PushState) => void>();
/* One-shot callbacks for an SDK that arrives after initOneSignal() already gave
   up on it — see onSdkReady(). */
const readyCallbacks = new Set<() => void>();

function emit(): void {
  const s = getPushState();
  listeners.forEach((cb) => cb(s));
}

/* The alias this browser is logged in to OneSignal as (none = not logged in). Lets
   us skip loading the SDK on a signed-out visit unless there is actually a stale
   alias to clear (clearPushAliasIfStale), and notice an alias another account left
   behind (dropOtherAlias). */
const ALIAS_FLAG = 'spendless-push-aliased';

function setAliasFlag(alias: string | null): void {
  try {
    if (alias) localStorage.setItem(ALIAS_FLAG, alias);
    else localStorage.removeItem(ALIAS_FLAG);
  } catch {
    /* private mode / quota — the flag is only an optimisation */
  }
}

function aliasedTo(): string | null {
  try {
    return localStorage.getItem(ALIAS_FLAG) || null;
  } catch {
    return null;
  }
}

export function isPushSupported(): boolean {
  // Deliberately checks the raw browser APIs rather than the SDK's own
  // isPushSupported(), so the settings toggle can render correctly before the
  // SDK has loaded. Returns false in an iOS Safari tab, which is what we want.
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

/** iOS/iPadOS can do web push from 16.4, but only when launched from the Home Screen. */
export function isIosNeedsInstall(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIos =
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ reports as Mac; the touch-point check disambiguates.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!isIos) return false;
  return !window.matchMedia('(display-mode: standalone)').matches;
}

function attachSdk(OneSignal: typeof OneSignalType): void {
  // Registering emit twice would fire every listener twice per change.
  if (sdk === OneSignal) return;
  sdk = OneSignal;
  sdkBlocked = false;
  OneSignal.Notifications.addEventListener('permissionChange', emit);
  OneSignal.User.PushSubscription.addEventListener('change', emit);
}

/** Idempotent. Resolves false when unsupported, VITE_ONESIGNAL_APP_ID is unset,
    or the SDK could not be loaded (see sdkBlocked).

    A false result can be superseded: when the timeout fires but the SDK turns
    up later, it is adopted and state listeners are told. So code that has to
    react to recovery should subscribe with onPushStateChange() rather than
    rely on this return value alone.

    A failure is NOT retried within the page: react-onesignal keeps its failed
    <script> tag and a module-level "failed" flag, so a second init() would just
    hang. Once the user allows the site in their blocker, a reload recovers. */
export function initOneSignal(): Promise<boolean> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    if (!isPushSupported()) return false;
    if (!APP_ID) {
      console.warn('[onesignal] VITE_ONESIGNAL_APP_ID is not set; push disabled');
      return false;
    }
    const loading = (async () => {
      const mod = await import('react-onesignal');
      const OneSignal = mod.default;
      await OneSignal.init({
        appId: APP_ID,
        // The app already owns a service worker at the root scope (sw.js, from
        // vite-plugin-pwa), so OneSignal's lives in its own folder with a matching
        // scope (public/onesignal/, public/_headers).
        serviceWorkerPath: 'onesignal/OneSignalSDKWorker.js',
        serviceWorkerParam: { scope: '/onesignal/' },
        // The Subscription Bell is off by default and stays off: reminders are
        // turned on from Profile → Notifications or the card on Lists.
        autoResubscribe: true,
        allowLocalhostAsSecureOrigin: import.meta.env.DEV,
      });
      return OneSignal;
    })();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<'timeout'>((resolve) => {
      timer = setTimeout(() => resolve('timeout'), INIT_TIMEOUT_MS);
    });
    try {
      const result = await Promise.race([loading, timeout]);
      if (result === 'timeout') {
        console.error('[onesignal] SDK did not load in time — likely blocked by a content blocker');
        sdkBlocked = true;
        emit();
        // A slow network rather than a blocker: adopt the SDK if it turns up after all.
        loading.then(
          (OneSignal) => {
            attachSdk(OneSignal);
            initPromise = Promise.resolve(true);
            emit();
            const pending = [...readyCallbacks];
            readyCallbacks.clear();
            pending.forEach((cb) => cb());
          },
          (err) => {
            console.warn('[onesignal] SDK also failed after the timeout:', err);
          }
        );
        return false;
      }
      attachSdk(result);
      return true;
    } catch (err) {
      console.error('[onesignal] init failed — likely blocked by a content blocker:', err);
      sdkBlocked = true;
      emit();
      return false;
    } finally {
      clearTimeout(timer);
    }
  })();
  return initPromise;
}

/** Runs cb once the SDK is attached: on the next microtask when it already is,
    otherwise when an SDK that missed the init timeout finally loads. Returns an
    unsubscribe, so a caller that goes away (sign-out, unmount) is never called
    back.

    For work that initOneSignal() returning false would otherwise skip for good:
    the late SDK updates the push state by itself, but nothing else would re-run
    the account setup that was waiting on it. */
export function onSdkReady(cb: () => void): () => void {
  if (sdk) {
    let live = true;
    queueMicrotask(() => {
      if (live) cb();
    });
    return () => {
      live = false;
    };
  }
  readyCallbacks.add(cb);
  return () => {
    readyCallbacks.delete(cb);
  };
}

export function getPushState(): PushState {
  if (!isPushSupported()) return 'unsupported';
  const native = typeof Notification !== 'undefined' ? Notification.permission : 'default';
  if (native === 'denied') return 'denied';
  // After 'denied' on purpose: the browser setting is the first thing to fix.
  if (sdkBlocked) return 'blocked';
  if (native === 'default') return 'default';
  // Granted at the browser level — the SDK decides whether we're actually opted in.
  if (!sdk) return 'granted-off';
  return sdk.User.PushSubscription.optedIn ? 'granted-on' : 'granted-off';
}

export function onPushStateChange(cb: (s: PushState) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export async function loginPushAlias(alias: string): Promise<void> {
  if (!(await initOneSignal()) || !sdk) return;
  try {
    await sdk.login(alias);
    setAliasFlag(alias);
  } catch (err) {
    console.error('[onesignal] login failed:', err);
  }
}

export async function logoutPush(): Promise<void> {
  // Only meaningful if the SDK actually loaded in this page; don't force-init
  // just to log out. clearPushAliasIfStale() handles the cold case.
  if (!sdk) return;
  try {
    await sdk.logout();
    setAliasFlag(null);
  } catch (err) {
    console.error('[onesignal] logout failed:', err);
  }
}

/* Shared-device safety net: if someone enabled push and then closed the tab
   without signing out, this browser's subscription stays aliased to them and
   keeps receiving their reminders. Called once at startup when there is no
   session. Loads the SDK only when this browser was actually aliased, so a
   normal logged-out visit still pays nothing.

   isSignedOut is asked again right before logging out, because the SDK can
   arrive well after this call (see onSdkReady). Someone may have signed in by
   then, and their alias must not be undone. */
export async function clearPushAliasIfStale(isSignedOut: () => Promise<boolean>): Promise<void> {
  try {
    if (!localStorage.getItem(ALIAS_FLAG)) return;
  } catch {
    return;
  }
  const clear = async () => {
    if (!sdk || !(await isSignedOut())) return;
    try {
      await sdk.logout();
      setAliasFlag(null);
    } catch (err) {
      console.error('[onesignal] stale alias cleanup failed:', err);
    }
  };
  if (await initOneSignal()) {
    await clear();
  } else {
    // Slow network rather than a blocker: the SDK may still turn up, and this
    // cleanup is exactly what must not be skipped on a shared device.
    onSdkReady(() => void clear());
  }
}

/* Another account's alias left on this browser: the signed-in account changed
   without a sign-out here (another tab switched the shared session). Logs out of it
   unless it is `current` (this account's own alias), so the device stops getting the
   previous account's reminders even when this account never turns reminders on.
   Loads the SDK only when there is such an alias. `stillCurrent` is asked again
   before logging out, since the SDK can arrive late. */
export async function dropOtherAlias(current: string | null, stillCurrent: () => boolean): Promise<void> {
  const prior = aliasedTo();
  if (!prior || prior === current) return;
  const drop = async () => {
    // Re-checked: this account may have logged in meanwhile, which already replaced it.
    if (!sdk || !stillCurrent() || aliasedTo() !== prior) return;
    try {
      await sdk.logout();
      setAliasFlag(null);
    } catch (err) {
      console.error('[onesignal] dropping the previous account failed:', err);
    }
  };
  if (await initOneSignal()) await drop();
  else onSdkReady(() => void drop());
}

/** init → requestPermission → optIn. Returns the resulting state. */
export async function enablePush(): Promise<PushState> {
  if (!isPushSupported()) return 'unsupported';
  // requestPermission() resolves without showing anything when permission is
  // already denied, which would otherwise leave the toggle silently refusing to
  // move. Check first so the UI can explain itself.
  if (Notification.permission === 'denied') return 'denied';
  if (!(await initOneSignal()) || !sdk) return sdkBlocked ? 'blocked' : 'unsupported';
  try {
    if (Notification.permission !== 'granted') {
      await sdk.Notifications.requestPermission();
    }
    if (Notification.permission !== 'granted') return getPushState();
    await sdk.User.PushSubscription.optIn();
  } catch (err) {
    console.error('[onesignal] enable failed:', err);
  }
  return getPushState();
}

/** Opts out of this app. Never attempts to revoke the browser-level permission. */
export async function disablePush(): Promise<void> {
  if (!sdk) return;
  try {
    await sdk.User.PushSubscription.optOut();
  } catch (err) {
    console.error('[onesignal] disable failed:', err);
  }
}

/** True when the SDK believes this device is subscribed. Per-BROWSER state — it
    must never be used to derive the account-wide push_settings.enabled flag,
    since another device may well be subscribed. */
export function isOptedIn(): boolean | undefined {
  return sdk?.User.PushSubscription.optedIn;
}

/* Subscribes this browser when the account already wants reminders but this
   particular browser is not subscribed — a second device, or one whose site data
   was cleared. This is what actually makes the feature cross-device: the new
   device starts receiving without the user doing anything.

   Gated on permission already being 'granted', which is what makes it safe to do
   unprompted: optIn() only shows the permission prompt when there is no valid
   token, so with permission in hand it cannot ambush anyone. */
export async function resubscribeIfPermitted(): Promise<void> {
  if (!isPushSupported() || Notification.permission !== 'granted') return;
  if (!sdk || sdk.User.PushSubscription.optedIn !== false) return;
  try {
    await sdk.User.PushSubscription.optIn();
  } catch (err) {
    console.error('[onesignal] silent resubscribe failed:', err);
  }
}
