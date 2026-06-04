import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
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

  // Auto-show on first login (or once after a version bump). Keyed on the
  // user id so it only evaluates when the signed-in user changes — dismissing
  // within a session won't retrigger it.
  useEffect(() => {
    if (loading || !user) return;
    if (readStoredVersion() < ONBOARDING_VERSION) setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, loading]);

  const start = useCallback(() => setOpen(true), []);

  const dismiss = useCallback(() => {
    persistCompletion();
    setOpen(false);
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'onboarding_dismissed');
    }
  }, []);

  return (
    <OnboardingContext.Provider value={{ open, start, dismiss }}>
      {children}
      <OnboardingTour open={open} onClose={dismiss} />
    </OnboardingContext.Provider>
  );
};
