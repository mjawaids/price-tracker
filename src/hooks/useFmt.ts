import { useCallback } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { formatPrice } from '../utils/currency';

/** Returns a `fmt(n)` formatter bound to the user's chosen currency. */
export const useFmt = () => {
  const { settings } = useSettings();
  return useCallback((n: number) => formatPrice(n ?? 0, settings.currency), [settings.currency]);
};
