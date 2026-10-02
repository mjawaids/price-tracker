import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { OnboardingTour } from '../components/onboarding/OnboardingTour';

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

interface OnboardingContextType {
  open: boolean;
  start: () => void;
  dismiss: () => void;
  /** Show the Compare walkthrough once, the first time Compare is opened. */
  maybeStartCompareTour: () => void;
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

  const dismiss = useCallback(() => {
    persistCompletion();
    setOpen(false);
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'onboarding_dismissed');
    }
  }, []);

  return (
    <OnboardingContext.Provider value={{ open, start, dismiss, maybeStartCompareTour }}>
      {children}
      <OnboardingTour open={open} onClose={dismiss} />
    </OnboardingContext.Provider>
  );
};
