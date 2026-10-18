// Still-to-buy reminders, the account side: spendless.push_settings (whether this
// person wants reminders, their time zone, the opaque alias OneSignal knows them by)
// plus this device's push state (src/lib/onesignal.ts). A module store like
// src/lib/install.ts, so Profile, the Lists card and AppContext share one state.
// The sender (scripts/push/reminders.ts) decides when a reminder goes out.
//
// `enabled` is account-wide; push permission is per device. So a device never turns
// the account off by itself: one that hasn't said yes yet just isn't subscribed, and
// a device that already has permission joins by itself when the account is on.
import { useSyncExternalStore } from 'react';
import { supabase } from './supabase';
import {
  PushState,
  disablePush,
  enablePush,
  getPushState,
  initOneSignal,
  isIosNeedsInstall,
  loginPushAlias,
  logoutPush,
  onPushStateChange,
  onSdkReady,
  resubscribeIfPermitted,
} from './onesignal';

export type { PushState } from './onesignal';

export interface PushInfo {
  /** Reading the account's setting: 'failed' = offline or an error (Try again). */
  status: 'idle' | 'loading' | 'ready' | 'failed';
  /** The account wants reminders (on any of its devices). */
  enabled: boolean;
  /** This device: never asked, allowed, refused, blocked, unsupported. */
  pushState: PushState;
  /** iPhone/iPad in a browser tab: reminders need the app on the Home Screen. */
  iosNeedsInstall: boolean;
  /** A switch is being turned on or off. */
  busy: boolean;
}

/** What turning reminders on or off ended with. */
export type PushResult = PushState | 'failed';

let state: PushInfo = { status: 'idle', enabled: false, pushState: 'default', iosNeedsInstall: false, busy: false };
let alias: string | null = null;
/** Bumped on every start and stop, so answers for an earlier account are dropped. */
let generation = 0;
let stopWaiting: (() => void) | undefined;
const listeners = new Set<() => void>();

const set = (patch: Partial<PushInfo>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const snapshot = () => state;

onPushStateChange((pushState) => set({ pushState }));

const timeZone = () => {
  try {
    return (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC').slice(0, 64);
  } catch {
    return 'UTC';
  }
};

export function usePush(): PushInfo {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/**
 * Read the account's setting (on sign-in, and again from Try again). When reminders
 * are on, this device logs in to OneSignal under the alias and, if it already has
 * permission, subscribes without asking (a second phone, or cleared site data).
 */
export async function startPush(): Promise<void> {
  const gen = ++generation;
  stopWaiting?.();
  set({ status: 'loading', pushState: getPushState(), iosNeedsInstall: isIosNeedsInstall() });
  try {
    const { data, error } = await supabase.from('push_settings').select('push_alias, enabled').maybeSingle();
    if (gen !== generation) return;
    if (error) throw error;
    alias = (data?.push_alias as string | undefined) ?? null;
    const enabled = !!data?.enabled;
    set({ status: 'ready', enabled });
    if (!enabled || !alias) return;
    const join = async () => {
      if (gen !== generation || !alias) return;
      await loginPushAlias(alias);
      await resubscribeIfPermitted();
      if (gen === generation) set({ pushState: getPushState() });
    };
    // Only a device that already has permission loads the SDK at start; the others
    // load it when someone turns reminders on here.
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    if (await initOneSignal()) await join();
    // A slow network: join when the SDK turns up after all (not after sign-out).
    else if (gen === generation) stopWaiting = onSdkReady(() => void join());
  } catch (error) {
    if (gen !== generation) return;
    console.error('Reminders: could not read the setting:', error instanceof Error ? error.message : 'unknown error');
    set({ status: 'failed' });
  }
}

/** Sign-out: this browser stops getting this account's reminders. */
export async function stopPush(): Promise<void> {
  generation++;
  stopWaiting?.();
  alias = null;
  set({ status: 'idle', enabled: false, busy: false });
  await logoutPush();
}

async function saveEnabled(enabled: boolean): Promise<boolean> {
  const timezone = timeZone();
  if (!alias) {
    // The first time: the row (and its alias) is made now.
    const { data, error } = await supabase.from('push_settings').insert({ enabled, timezone }).select('push_alias').single();
    if (!error) {
      alias = data.push_alias as string;
      return true;
    }
    // Made meanwhile in another tab: read it and update it below.
    if (error.code !== '23505') throw error;
    const again = await supabase.from('push_settings').select('push_alias').maybeSingle();
    if (again.error || !again.data) throw again.error ?? new Error('no settings row');
    alias = again.data.push_alias as string;
  }
  // Turning it on is a fresh choice, so it takes this device's time zone.
  const patch = enabled ? { enabled, timezone } : { enabled };
  const { error } = await supabase.from('push_settings').update(patch).eq('push_alias', alias);
  if (error) throw error;
  return true;
}

/**
 * Turn reminders on (asks this browser for permission first) or off (this device
 * unsubscribes and the account stops). Resolves to this device's push state, or
 * 'failed' when the setting couldn't be saved.
 */
export async function setReminders(on: boolean): Promise<PushResult> {
  if (state.busy) return state.pushState;
  const gen = generation;
  set({ busy: true });
  try {
    if (on) {
      const pushState = await enablePush();
      if (gen !== generation) return pushState;
      set({ pushState });
      if (pushState !== 'granted-on') return pushState;
      await saveEnabled(true);
      if (gen !== generation || !alias) return pushState;
      set({ enabled: true, status: 'ready' });
      await loginPushAlias(alias);
      return pushState;
    }
    await disablePush();
    set({ pushState: getPushState() });
    if (alias) await saveEnabled(false);
    if (gen === generation) set({ enabled: false });
    return getPushState();
  } catch (error) {
    console.error('Reminders: could not save the setting:', error instanceof Error ? error.message : 'unknown error');
    return 'failed';
  } finally {
    if (gen === generation) set({ busy: false });
  }
}
