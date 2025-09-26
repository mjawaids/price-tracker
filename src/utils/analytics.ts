// Google Analytics utility functions
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

// Initialize Google Analytics
export const initGA = (measurementId: string) => {
  // Create script tag for Google Analytics
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  // Initialize dataLayer and gtag function
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  // Configure Google Analytics
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    page_title: document.title,
    page_location: window.location.href,
  });
};

// Track page views
export const trackPageView = (path: string, title?: string) => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('config', import.meta.env.VITE_GA_MEASUREMENT_ID, {
      page_path: path,
      page_title: title || document.title,
    });
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
  }
};

// Track user interactions
export const trackUserAction = (action: string, details?: Record<string, any>) => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', action, {
      event_category: 'user_interaction',
      ...details,
    });
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

// Track shopping list actions
export const trackShoppingList = (action: string, listId?: string, itemCount?: number) => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', action, {
      event_category: 'shopping_list',
      list_id: listId,
      item_count: itemCount,
    });
  }
};

// Track product actions
export const trackProduct = (action: string, productId?: string, category?: string) => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', action, {
      event_category: 'product',
      product_id: productId,
      product_category: category,
    });
  }
};

// Track store actions
export const trackStore = (action: string, storeId?: string, storeType?: string) => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', action, {
      event_category: 'store',
      store_id: storeId,
      store_type: storeType,
    });
  }
};

// Track price comparisons
export const trackPriceComparison = (productId: string, storeCount: number, savings?: number) => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', 'price_comparison', {
      event_category: 'engagement',
      product_id: productId,
      store_count: storeCount,
      potential_savings: savings,
    });
  }
};

// Track search actions
export const trackSearch = (searchTerm: string, resultCount: number) => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', 'search', {
      search_term: searchTerm,
      result_count: resultCount,
    });
  }
};