import React, { createContext, useContext, useEffect } from 'react';

// SpendLess ships a single light, warm-paper theme. This provider is kept as a
// no-op (light only) so existing imports keep working without a dark variant.
interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

const noop = () => {};

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  toggleTheme: noop,
  theme: 'light',
  setTheme: noop,
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    // Ensure no stale dark class lingers from a previous version.
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('light-mode');
  }, []);

  return (
    <ThemeContext.Provider value={{ isDark: false, toggleTheme: noop, theme: 'light', setTheme: noop }}>
      {children}
    </ThemeContext.Provider>
  );
};
