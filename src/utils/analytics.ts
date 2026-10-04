// Google Analytics utility functions
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

// Initialize Google Analytics
export const initGA = (measurementId: string) => {
  if (!measurementId || measurementId.trim() === '') {
    console.warn('Google Analytics: No measurement ID provided');
    return;
  }

  // Check if gtag is already initialized
  if (window.gtag) {
    console.log('Google Analytics already initialized');
    return;
  }

  console.log('Initializing Google Analytics with ID:', measurementId);

  // Load gtag script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  // Initialize dataLayer and gtag function
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params -- GA's official snippet pushes the live arguments object
    window.dataLayer.push(arguments);
  };

  // Configure Google Analytics
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    page_title: document.title,
    page_location: window.location.href,
    send_page_view: true
  });

  console.log('Google Analytics initialized successfully');
};

// Track page views
export const trackPageView = (path: string, title?: string) => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('config', import.meta.env.VITE_GA_MEASUREMENT_ID, {
      page_path: path,
      page_title: title || document.title,
    });
  } else {
    console.warn('Google Analytics not initialized - trackPageView called');
  }
};

// Track custom events
export const trackEvent = (action: string, category: string, label?: string, value?: number) => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  } else {
    console.warn('Google Analytics not initialized - trackEvent called');
  }
};

// Track user interactions
export const trackUserAction = (action: string, details?: Record<string, unknown>) => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', action, {
      event_category: 'user_interaction',
      ...details,
    });
  } else {
    console.warn('Google Analytics not initialized - trackUserAction called');
  }
};

// Track authentication events
export const trackAuth = (action: 'sign_up' | 'sign_in' | 'sign_out' | 'password_reset') => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', action, {
      event_category: 'authentication',
    });
  }
};

