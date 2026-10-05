// Contextual tips shown one at a time, each only once per user (see useHint).
// Copy lives here so it can be reviewed and tuned in one place.

export const HINTS = {
  paste: 'Press Enter to add. Paste a whole list to add everything at once.',
  tick: 'Tap the circle when it’s in your cart. Ticked items wait at the bottom.',
  aisles: 'Your list is sorted by aisle so you can shop in one pass. Tap an item to move it.',
  details: 'Need a brand or size? Tap an item to add a note or quantity.',
  clear: 'Ticked items wait here. Tap Clear when you’re done shopping — we’ll remember them for next time.',
  swipe: 'Swipe right to tick, left to delete.',
  often: 'Your regulars — one tap adds them again.',
  switcher: 'Shopping somewhere else too? Tap the list name to make another list.',
  whereToBuy: 'Tap to see which stores make this list cheapest, delivery included.',
  assumed: 'We picked a product for these. Tap one to choose the brand and size you want.',
  storeSections: 'Your list is now split by store. Switch back to aisles any time.',
  focusStore: 'Shopping now? Tap “Shop here” to see just that store’s part of the list.',
  myStores: 'Comparing lots of stores? Pick just the ones you shop at.',
  freshness: 'Older prices may have changed. Spotted a new one? Add it — it helps everyone.',
} as const;

export type HintId = keyof typeof HINTS;

/** Rotating add-bar placeholders — each one teaches a quick-add trick. */
export const ADD_PLACEHOLDERS = [
  'Add an item — try “2 milk”',
  'Try “atta 10 kg”',
  'Try “eggs 12” or “bread x2”',
  'Paste a list to add many at once',
];
