import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { useSettings } from './SettingsContext';
import { useLists } from './ListsContext';
import { useCompare } from './CompareContext';
import { useFmt } from '../hooks/useFmt';
import { clearShared } from '../lib/receipt/inbox';
import { deleteReceiptMemory } from '../lib/receipt/memory';
import { resetReceipt } from '../lib/receipt/session';
import { clearRef, recordReferral } from '../lib/invite';
import { startPush, stopPush } from '../lib/push';
import { trackUserAction } from '../utils/analytics';
import { clearLayers, goBack, pushLayer, startBackStack, stopBackStack } from '../lib/backStack';

export type ScreenName =
  | 'lists'
  | 'plan'
  | 'prices'
  | 'search'
  | 'detail'
  | 'stores'
  | 'contribute'
  | 'mproducts'
  | 'receipt'
  | 'contributions'
  | 'profile';

/** Top-level app sections: quick Lists (default) and price Compare. */
export type Section = 'lists' | 'compare' | 'profile';

const sectionOf = (screen: ScreenName): Section =>
  screen === 'lists' || screen === 'plan' ? 'lists' : screen === 'profile' ? 'profile' : 'compare';
export type SheetName = 'currency' | 'region' | 'help' | null;
export type ScreenParams = Record<string, unknown>;

interface StackEntry {
  screen: ScreenName;
  params: ScreenParams;
}

export interface AppApi {
  // identity
  user: { name: string; email: string; avatarUrl?: string };
  // preferences
  fmt: (n: number) => string;
  currencyCode: string;
  setCurrencyCode: (code: string) => void;
  // navigation
  screen: ScreenName;
  params: ScreenParams;
  section: Section;
  openSection: (s: Section) => void;
  go: (screen: ScreenName, params?: ScreenParams) => void;
  back: () => void;
  tab: (screen: ScreenName, params?: ScreenParams) => void;
  canGoBack: boolean;
  /** Screens on the stack (1 = a tab's root); the Shell keeps scroll per depth. */
  depth: number;
  /** Changes with every new tab root, so the Shell can tell a tab switch from back. */
  rootId: number;
  // sheets (help takes an optional topic id)
  sheet: SheetName;
  sheetTopic: string | null;
  openSheet: (s: SheetName, topic?: string) => void;
  // auth
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppApi | undefined>(undefined);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: authUser, signOut: authSignOut } = useAuth();
  const { settings, updateSettings } = useSettings();
  const fmt = useFmt();
  const { clearLocalData: clearLocalLists } = useLists();
  const { clearLocalData: clearLocalCatalog } = useCompare();
  const [stack, setStack] = useState<StackEntry[]>([{ screen: 'lists', params: {} }]);
  const [rootId, setRootId] = useState(0);
  const [sheet, setSheet] = useState<SheetName>(null);
  const [sheetTopic, setSheetTopic] = useState<string | null>(null);

  // Back closes the last screen opened, then a tab other than Lists goes to Lists
  // (src/lib/backStack.ts). Each step is a layer with its own history entry.
  useEffect(() => {
    startBackStack();
    return stopBackStack;
  }, []);

  // Opened from an invite link and signed in with a new account: record it once
  // (src/lib/invite.ts), now or when back online.
  const accountId = authUser?.id;
  const accountCreatedAt = authUser?.created_at;
  useEffect(() => {
    if (!accountId) return;
    const send = () => void recordReferral(accountCreatedAt).then((ok) => {
      if (ok && typeof window.gtag !== 'undefined') trackUserAction('invite_joined');
    });
    send();
    window.addEventListener('online', send);
    return () => window.removeEventListener('online', send);
  }, [accountId, accountCreatedAt]);

  // Still-to-buy reminders: read this account's setting; a device that already allows
  // notifications joins by itself (src/lib/push.ts).
  useEffect(() => {
    if (!accountId) return;
    void startPush();
  }, [accountId]);

  const api: AppApi = useMemo(() => {
    const cur = stack[stack.length - 1];
    const toLists = () => {
      setStack([{ screen: 'lists', params: {} }]);
      setRootId((n) => n + 1);
    };
    // A new tab root: earlier screens' history entries go; a root other than Lists
    // gets one, so back returns to Lists.
    const setRoot = (screen: ScreenName, params: ScreenParams) => {
      setStack([{ screen, params }]);
      setRootId((n) => n + 1);
      clearLayers();
      if (screen !== 'lists') pushLayer(toLists);
    };
    return {
      user: {
        name: (authUser?.user_metadata?.full_name as string) || authUser?.email?.split('@')[0] || 'Guest',
        email: authUser?.email || '',
        // Custom upload takes precedence, then the Google-provided photo, then initials.
        avatarUrl:
          (authUser?.user_metadata?.avatar_url as string) ||
          (authUser?.user_metadata?.picture as string) ||
          undefined,
      },

      fmt,
      currencyCode: settings.currency,
      setCurrencyCode: (code: string) => updateSettings({ currency: code }),

      screen: cur.screen,
      params: cur.params,
      section: sectionOf(cur.screen),
      openSection: (s: Section) => setRoot(s === 'compare' ? 'prices' : s, {}),
      go: (screen: ScreenName, params: ScreenParams = {}) => {
        setStack((s) => [...s, { screen, params }]);
        pushLayer(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)));
      },
      back: () => {
        if (!goBack()) setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
      },
      tab: (screen: ScreenName, params: ScreenParams = {}) => setRoot(screen, params),
      canGoBack: stack.length > 1,
      depth: stack.length,
      rootId,

      sheet,
      sheetTopic,
      openSheet: (s: SheetName, topic?: string) => {
        setSheetTopic(topic ?? null);
        setSheet(s);
      },

      signOut: async () => {
        // First, so this browser stops getting this account's reminders.
        await stopPush();
        toLists();
        clearLayers();
        resetReceipt();
        await clearShared();
        await clearLocalLists();
        await clearLocalCatalog();
        if (authUser?.id) await deleteReceiptMemory(authUser.id);
        clearRef();
        try {
          localStorage.removeItem('spendless-recent-searches'); // SearchScreen's recent terms
        } catch {
          /* storage unavailable */
        }
        await authSignOut();
      },
    };
  }, [stack, rootId, sheet, sheetTopic, settings.currency, authUser, fmt, updateSettings, authSignOut, clearLocalLists, clearLocalCatalog]);

  return <AppContext.Provider value={api}>{children}</AppContext.Provider>;
};
