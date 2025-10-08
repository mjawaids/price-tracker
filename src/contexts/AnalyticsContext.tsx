import React, { createContext, useContext, useEffect } from 'react';
import { initGA, trackPageView } from '../utils/analytics';

interface AnalyticsContextType {
  isInitialized: boolean;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
};

export const AnalyticsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInitialized, setIsInitialized] = React.useState(false);

  useEffect(() => {
    const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
    const isDevelopment = import.meta.env.DEV;
    const enableInDev = import.meta.env.VITE_GA_ENABLE_IN_DEV === 'true';

    console.log('Analytics Context:', {
      measurementId: measurementId ? `${measurementId.substring(0, 5)}...` : 'NOT SET',
      isDevelopment,
      enableInDev,
      gtagExists: typeof window.gtag !== 'undefined',
      willInitialize: measurementId && (!isDevelopment || enableInDev)
    });

    // Check if gtag is already loaded from HTML
    if (typeof window.gtag !== 'undefined') {
      console.log('Google Analytics already loaded from HTML');
      setIsInitialized(true);
      trackPageView(window.location.pathname, document.title);
      return;
    }

    if (!measurementId) {
      console.error('CRITICAL: VITE_GA_MEASUREMENT_ID environment variable is not set!');
      return;
    }

    // Only initialize in production or when explicitly enabled (fallback if HTML init failed)
    if (!isDevelopment || enableInDev) {
      try {
        console.log('Initializing Google Analytics from React...');
        initGA(measurementId);
        setIsInitialized(true);

        // Track initial page view
        trackPageView(window.location.pathname, document.title);

        console.log('Google Analytics setup complete');
      } catch (error) {
        console.error('Failed to initialize Google Analytics:', error);
      }
    } else {
      console.log('Google Analytics disabled in development mode');
    }
  }, []);

  const value = {
    isInitialized,
  };

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
};