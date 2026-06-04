import { IconName } from '../ui';

export interface OnboardingStep {
  icon: IconName;
  title: string;
  body: string;
  tip: string;
}

// Walkthrough content — introduces SpendLess's core loop:
// find products → track prices → build cart → get an optimized plan.
export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    icon: 'spark',
    title: 'Welcome to SpendLess',
    body: 'Track product prices across your stores, build a cart, and let us work out the cheapest way to shop. Here’s a quick 30-second tour.',
    tip: 'You can replay this anytime from Profile → Help.',
  },
  {
    icon: 'search',
    title: 'Find products',
    body: 'Browse the shared catalogue or use search to jump straight to what you need. Tap a product to see its price at every store.',
    tip: 'Use the Browse tab or the search bar up top.',
  },
  {
    icon: 'tag',
    title: 'Track prices',
    body: 'Add stores and the prices you’ve spotted under the Catalogue — products, stores and prices. Keep them fresh to get the best comparisons.',
    tip: 'The catalogue is shared, so prices help everyone.',
  },
  {
    icon: 'cart',
    title: 'Build your cart',
    body: 'Add the items you plan to buy and set quantities. Your cart is private to you and stays synced to your account.',
    tip: 'Tap + on any product to drop it in your cart.',
  },
  {
    icon: 'receipt',
    title: 'Get an optimized plan',
    body: 'SpendLess crunches every store combination — including delivery fees — to give you a multi-store shopping plan that spends the least.',
    tip: 'Open the Plan tab once your cart has a few items.',
  },
  {
    icon: 'coin',
    title: 'Make it yours',
    body: 'Set your currency and location in Profile so prices and stores match where you shop.',
    tip: 'Replay this tour anytime from Profile → Help.',
  },
];
