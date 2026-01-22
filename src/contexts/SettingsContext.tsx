import React, { createContext, useContext, useEffect, useState } from 'react';
import { getDefaultCurrency } from '../utils/currency';
import { useTheme } from './ThemeContext';

interface UserSettings {
  currency: string;
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  language: string;
}

interface SettingsContextType {
  settings: UserSettings;
  updateSettings: (updates: Partial<UserSettings>) => void;
  resetSettings: () => void;
}

const defaultSettings: UserSettings = {
  currency: getDefaultCurrency(),
  theme: 'system',
  notifications: true,
  language: 'en',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const { setTheme } = useTheme();

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('price-tracker-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
        // Apply theme setting
        if (parsed.theme) {
          setTheme(parsed.theme);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array is intentional - load settings once on mount

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('price-tracker-settings', JSON.stringify(settings));
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