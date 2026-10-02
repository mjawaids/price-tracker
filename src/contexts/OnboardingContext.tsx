import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { OnboardingTour } from '../components/onboarding/OnboardingTour';
import { HintId } from '../lib/hints';

// Bump this when the walkthrough changes meaningfully — existing users
// (whose stored version is lower) will then see it again once on next login.
const ONBOARDING_VERSION = 1;
const STORAGE_KEY = 'price-tracker-onboarding';

interface StoredState {
  version: number;
  completedAt: string;
}

function readStoredVersion(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    return typeof parsed.version === 'number' ? parsed.version : 0;
  } catch (error) {
    console.error('Error reading onboarding state:', error);
    return 0;
  }
}

function persistCompletion() {
  try {
    const state: StoredState = { version: ONBOARDING_VERSION, completedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving onboarding state:', error);
  }
}

// ── Contextual tips ──────────────────────────────────────────────────────────
// One tip at a time; each is shown once per user; a short pause after one is
// dismissed before the next appears, so tips never pile up.
const HINT_COOLDOWN_MS = 20_000;
const hintsKey = (userId: string) => `spendless-hints:${userId}`;

interface HintsState {
  seen: string[];
  off: boolean;
}

function readHints(userId: string): HintsState {
  try {
    const raw = localStorage.getItem(hintsKey(userId));
    const parsed = raw ? (JSON.parse(raw) as Partial<HintsState>) : {};
    return { seen: Array.isArray(parsed.seen) ? parsed.seen : [], off: !!parsed.off };
  } catch (error) {
    console.error('Error reading tips state:', error);
    return { seen: [], off: false };
  }
}

function saveHints(userId: string, state: HintsState) {
  try {
    localStorage.setItem(hintsKey(userId), JSON.stringify(state));
  } catch (error) {
    console.error('Error saving tips state:', error);
  }
}

interface OnboardingContextType {
  open: boolean;
  start: () => void;
  dismiss: () => void;
  /** Show the Compare walkthrough once, the first time Compare is opened. */
  maybeStartCompareTour: () => void;
  // tips
  tipsOn: boolean;
  setTipsOn: (on: boolean) => void;
  resetTips: () => void;
  activeHint: HintId | null;
  /** Changes when a cooldown ends, so waiting hints re-request. */
  hintClock: number;
  requestHint: (id: HintId) => void;
  releaseHint: (id: HintId) => void;
  /** Dismissed via "Got it", or the user did the thing the tip describes. */
  markHintSeen: (id: HintId) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const useOnboarding = () => {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within an OnboardingProvider');
  return ctx;
};

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);

  // Lists teach themselves (empty state + hints), so the walkthrough — which is
  // about price comparison — waits until the user first opens Compare. Checked
  // once per signed-in user per session.
  const checkedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!user) checkedFor.current = null;
  }, [user]);
  const maybeStartCompareTour = useCallback(() => {
    if (loading || !user || checkedFor.current === user.id) return;
    checkedFor.current = user.id;
    if (readStoredVersion() < ONBOARDING_VERSION) setOpen(true);
  }, [loading, user]);

  const start = useCallback(() => setOpen(true), []);

  const userId = user?.id ?? null;
  const [hints, setHints] = useState<HintsState>({ seen: [], off: false });
  const [activeHint, setActiveHint] = useState<HintId | null>(null);
  const [hintClock, setHintClock] = useState(0);
  const lastDismissAt = useRef(0);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setHints(userId ? readHints(userId) : { seen: [], off: false });
    setActiveHint(null);
  }, [userId]);
  useEffect(() => () => {
    if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
  }, []);

  const updateHints = useCallback(
    (fn: (h: HintsState) => HintsState) => {
      setHints((cur) => {
        const next = fn(cur);
        if (userId) saveHints(userId, next);
        return next;
      });
    },
    [userId],
  );

  const requestHint = useCallback(
    (id: HintId) => {
      if (hints.off || hints.seen.includes(id)) return;
      const wait = lastDismissAt.current + HINT_COOLDOWN_MS - Date.now();
      if (wait > 0) {
        if (!cooldownTimer.current) {
          cooldownTimer.current = setTimeout(() => {
            cooldownTimer.current = null;
            setHintClock((c) => c + 1);
          }, wait);
        }
        return;
      }
      setActiveHint((cur) => cur ?? id);
    },
    [hints],
  );

  const releaseHint = useCallback((id: HintId) => setActiveHint((cur) => (cur === id ? null : cur)), []);

  const markHintSeen = useCallback(
    (id: HintId) => {
      setActiveHint((cur) => {
        if (cur === id) lastDismissAt.current = Date.now();
        return cur === id ? null : cur;
      });
      updateHints((h) => (h.seen.includes(id) ? h : { ...h, seen: [...h.seen, id] }));
    },
    [updateHints],
  );

  const setTipsOn = useCallback(
    (on: boolean) => {
      if (!on) setActiveHint(null);
      updateHints((h) => ({ ...h, off: !on }));
    },
    [updateHints],
  );

  const resetTips = useCallback(() => {
    lastDismissAt.current = 0;
    updateHints(() => ({ seen: [], off: false }));
    setHintClock((c) => c + 1);
  }, [updateHints]);

  const dismiss = useCallback(() => {
    persistCompletion();
    setOpen(false);
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'onboarding_dismissed');
    }
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        open,
        start,
        dismiss,
        maybeStartCompareTour,
        tipsOn: !hints.off,
        setTipsOn,
        resetTips,
        activeHint,
        hintClock,
        requestHint,
        releaseHint,
        markHintSeen,
      }}
    >
      {children}
      <OnboardingTour open={open} onClose={dismiss} />
    </OnboardingContext.Provider>
  );
};
