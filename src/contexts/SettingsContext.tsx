import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTheme } from './ThemeContext';

/** Shopping features people can turn on or off (Profile → Compare prices). */
export interface ShoppingFeatures {
  /** Compare prices: "Where to buy" on lists and the Compare section. The other two count only while it's on. */
  whereToBuy: boolean;
  /** "Was it …?" when ticking an item from a plan, and the store summary. */
  askPrices: boolean;
  /** Receipt import. */
  receipts: boolean;
}


interface UserSettings {
  currency: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  /** Legacy free-text location; replaced by `regionId`. */
  location: string | null;
  /** City for Compare (spendless.regions id), chosen once; null = not chosen yet. */
  regionId: string | null;
  features: ShoppingFeatures;
  /** Lists: group open items by aisle (off = order added). */
  groupListsByAisle: boolean;
  /** The first run (welcome, city) is done. False only on a device with no saved settings yet. */
  setupDone: boolean;
}

interface SettingsContextType {
  settings: UserSettings;
  updateSettings: (updates: Partial<UserSettings>) => void;
  resetSettings: () => void;
}

const defaultSettings: UserSettings = {
  currency: 'PKR',
  theme: 'light',
  language: 'en',
  location: null,
  regionId: null,
  features: { whereToBuy: true, askPrices: true, receipts: true },
  groupListsByAisle: true,
  setupDone: false,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

/**
 * The features in effect. Compare prices (`whereToBuy`) is the main switch: price checks
 * and receipts are part of Compare, so they're off while it is.
 */
export const useFeatures = () => {
  const f = useSettings().settings.features;
  const compare = f.whereToBuy;
  return { compare, whereToBuy: compare, askPrices: compare && f.askPrices, receipts: compare && f.receipts };
};

const STORAGE_KEY = 'price-tracker-settings';

// Read synchronously so the first render already uses the saved settings (no
// flash of defaults, and nothing to overwrite before it loads).
function loadSettings(): UserSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<UserSettings> & { notifications?: unknown };
      delete parsed.notifications; // an old switch nothing read
      // Saved settings = someone already used the app here: keep them as they are, no first run.
      return { ...defaultSettings, setupDone: true, ...parsed, features: { ...defaultSettings.features, ...(parsed.features || {}) } };
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
  return defaultSettings;
}

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<UserSettings>(loadSettings);
  const { setTheme } = useTheme();

  // Apply the saved theme once on mount
  useEffect(() => {
    setTheme(settings.theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }, [settings]);

  const updateSettings = (updates: Partial<UserSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
    // Apply theme changes immediately
    if (updates.theme) {
      setTheme(updates.theme);
    }
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  const value = {
    settings,
    updateSettings,
    resetSettings,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};