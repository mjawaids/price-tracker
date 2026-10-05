import { IconName } from '../ui';

export interface OnboardingStep {
  icon: IconName;
  title: string;
  body: string;
  tip: string;
}

// Where to buy walkthrough — shown the first time someone opens Where to buy on a
// list (PlanScreen), and replayable from Profile → Help. Keep it to the flow:
// a list → the cheapest stores → choosing products → the list split by store.
export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    icon: 'tag',
    title: 'Where to buy your list',
    body: 'We look at the whole list and find the stores that make it cheapest — delivery fees and minimum orders included.',
    tip: 'Pick Cheapest, One stop, Delivered or Fewer stops.',
  },
  {
    icon: 'box',
    title: 'Any bread, or your bread',
    body: 'Write items the way you always do. We pick a sensible product and tell you which. Tap any item to choose the brand and size — just this time, or as your usual.',
    tip: '“Dawn bread” sticks to Dawn; “bread” lets brands compete.',
  },
  {
    icon: 'store',
    title: 'Your stores',
    body: 'Choose the stores you shop at. Where shared prices are live they’re filled in for you; anywhere else, add your own stores and the prices you see.',
    tip: 'Compare → Stores, any time.',
  },
  {
    icon: 'lists',
    title: 'One list, split by store',
    body: 'Use a plan and your list splits into a section per store, with what to buy and roughly what it costs. In the shop, tap Shop here to see just that part.',
    tip: 'Replay this from Profile → Help.',
  },
];
