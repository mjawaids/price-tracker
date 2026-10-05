import { lazy } from 'react';

// Public info pages are rarely opened; keep them out of the main bundle.
export const Privacy = lazy(() => import('./Privacy'));
export const Refund = lazy(() => import('./Refund'));
export const Terms = lazy(() => import('./Terms'));
export const Pricing = lazy(() => import('./Pricing'));
export const Bot = lazy(() => import('./Bot'));
