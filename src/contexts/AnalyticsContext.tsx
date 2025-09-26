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
    
    if (measurementId && !isInitialized) {
      // Only initialize in production or when explicitly enabled
      const isDevelopment = import.meta.env.DEV;
      const enableInDev = import.meta.env.VITE_GA_ENABLE_IN_DEV === 'true';
      
      if (!isDevelopment || enableInDev) {
        initGA(measurementId);
        setIsInitialized(true);
        
        // Track initial page view
        trackPageView(window.location.pathname);
        
        console.log('Google Analytics initialized with ID:', measurementId);
      } else {
        console.log('Google Analytics disabled in development mode');
      }
    }
  }, [isInitialized]);

  const value = {
    isInitialized,
  };

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
};