// Still-to-buy reminders: the messages and when the Lists card shows (pushParts.tsx
// draws them).
import { useEffect, useState } from 'react';
import { PushResult, usePush } from '../../lib/push';
import { trackUserAction } from '../../utils/analytics';

export const track = (action: string, details?: Record<string, unknown>) => {
  // Counts only.
  if (typeof window !== 'undefined' && typeof window.gtag !== 'undefined') trackUserAction(action, details);
};

/** What to tell someone after turning reminders on didn't end with them on. */
export function pushProblem(r: PushResult): string | null {
  switch (r) {
    case 'denied':
      return 'Notifications are blocked for this site. Allow them in your browser’s site settings, then try again.';
    case 'blocked':
      return 'Something on this device is blocking notifications, like an ad blocker. Allow this site, then reload.';
    case 'unsupported':
      return 'This browser can’t show notifications.';
    case 'failed':
      return 'Couldn’t save that. Check your connection and try again.';
    case 'default':
    case 'granted-off':
      return 'Notifications weren’t turned on. Try again when you’re ready.';
    default:
      return null;
  }
}

// ── The card on Lists ────────────────────────────────────────────────────────
const PROMPT_KEY = (uid: string) => `spendless-push-prompt:${uid}`;
/** After "Not now", ask again only after this long. */
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;
/** Offered once something on the list has waited this long (so they came back). */
const WAITING_MS = 24 * 60 * 60 * 1000;

function promptHidden(uid: string): boolean {
  try {
    const raw = localStorage.getItem(PROMPT_KEY(uid));
    if (!raw) return false;
    const v = JSON.parse(raw) as { never?: unknown; until?: unknown };
    return v.never === true || (typeof v.until === 'number' && Date.now() < v.until);
  } catch {
    return false;
  }
}
function hidePrompt(uid: string, never: boolean) {
  try {
    localStorage.setItem(PROMPT_KEY(uid), JSON.stringify(never ? { never: true } : { until: Date.now() + SNOOZE_MS }));
  } catch {
    /* storage unavailable: it just shows again next time */
  }
}

/**
 * Whether to offer reminders on Lists: only where this browser can still be asked
 * (never on iPhone in a tab, never once refused), when something on the list has
 * waited a day, and not after "Not now" (14 days) or ✕ (for good, on this device).
 */
export function usePushPrompt(uid: string | null, oldestOpen: number | null) {
  const push = usePush();
  const [hidden, setHidden] = useState(() => (uid ? promptHidden(uid) : true));
  useEffect(() => setHidden(uid ? promptHidden(uid) : true), [uid]);
  const waited = oldestOpen != null && Date.now() - oldestOpen > WAITING_MS;
  const show =
    !!uid && !hidden && waited && !!import.meta.env.VITE_ONESIGNAL_APP_ID && push.status === 'ready' && push.pushState === 'default' && !push.iosNeedsInstall;
  const dismiss = (never: boolean) => {
    if (!uid) return;
    hidePrompt(uid, never);
    setHidden(true);
    track('push_prompt_dismissed', { how: never ? 'close' : 'not_now' });
  };
  return { show, alsoHere: push.enabled, busy: push.busy, dismiss };
}

