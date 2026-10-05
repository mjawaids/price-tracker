// In-app help: short topics opened from Profile → Help and from the "?" buttons
// next to things that need explaining (app.openSheet('help', topicId)).
// Keep the copy true to what the code does — update it with the feature.
import type { IconName } from '../components/ui/Icon';

export interface HelpTopic {
  id: string;
  title: string;
  icon: IconName;
  /** One line for the topic list. */
  summary: string;
  /** Paragraphs. */
  body: string[];
}

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'lists',
    title: 'Making a list',
    icon: 'lists',
    summary: 'Quick add, aisles, ticking off, offline',
    body: [
      'Type what you need — “bread”, “2 milk”, “atta 10 kg” — and press Enter. You can paste a whole list to add it all at once.',
      'Items are grouped by aisle so you can shop in one pass. Tap an item to change its name, quantity or note.',
      'Tap the circle when something is in your cart. When you’re done, Clear ticked items — we remember them so you can add them again with one tap.',
      'Lists work without a connection and sync when you’re back online.',
    ],
  },
  {
    id: 'where-to-buy',
    title: 'Where to buy',
    icon: 'tag',
    summary: 'How we find the cheapest stores for your list',
    body: [
      'Tap Where to buy on a list. We match each item to products at your stores and try every mix of up to 4 stores to find the lowest total for the whole list, delivery fees and minimum orders included.',
      'You get up to four choices: Cheapest; One stop (everything at one store); Delivered (online stores only); and Fewer stops (fewer stores than Cheapest, for a little more). A choice is hidden when it’s the same as another.',
      '“You save” compares the plan with buying everything at the best single store.',
      'Use this plan splits your list into one section per store. Tap Shop here on a store to see just its part. Items we have no price for go under Anywhere.',
    ],
  },
  {
    id: 'brands',
    title: 'Brands and sizes',
    icon: 'box',
    summary: 'What we pick when you just write “bread”',
    body: [
      'When an item names a brand or kind (“Dawn bread”, “brown bread”), we stick to it. When it doesn’t, we pick the one you bought last, or else the one most of your stores carry — and say so in the plan.',
      'For most groceries we also let other brands of a similar size (within about 15%) compete on price. For personal care, baby and pharmacy items we keep to the exact product, since people tend to stick with theirs.',
      'Tap an item in the plan (or Compare prices on an item) to choose: Exactly this one, This brand in a similar size, or Any brand in a similar size. Use it Just this time, or Save as my usual for every list.',
    ],
  },
  {
    id: 'prices',
    title: 'Where prices come from',
    icon: 'history',
    summary: 'Shared prices, your prices, and how fresh they are',
    body: [
      'In cities where shared prices are live, prices come from store catalogues and from people who shop there. Each price is the typical recent one: newer reports count more, and reports older than 30 days drop out once newer ones arrive.',
      'A price you add is used for you straight away (for 30 days), unless a newer one comes in from someone else.',
      'Each price shows how old it is. Prices change — if you see a different one, add it.',
    ],
  },
  {
    id: 'stores',
    title: 'Your city and stores',
    icon: 'store',
    summary: 'Choosing what gets compared',
    body: [
      'Pick your city once. Where shared prices are live, its stores are added for you. Anywhere else, Compare uses the stores and prices you add yourself.',
      'In Compare → Stores, choose the stores you actually shop at — Where to buy then compares only those.',
      'Add a store of your own (a local shop or a delivery app) with its delivery fee and minimum order. Stores you add are private to you.',
    ],
  },
  {
    id: 'contribute',
    title: 'Adding prices',
    icon: 'heart',
    summary: 'Sharing, privacy and keeping prices honest',
    body: [
      'In Compare → Contribute, find the product, pick the store and enter the price for one pack. Can’t find it? Add it as your own product.',
      'A price at a shared store helps everyone in your city. It’s shared without your name or account.',
      'To keep shared prices honest, a price far from the usual one at a shared store is used for you only, for now. Adding a new price for the same product and store within 10 minutes replaces your last one, and you can add up to 500 prices a day.',
      'Your own stores and products — and the prices you add to them — stay private.',
    ],
  },
  {
    id: 'features',
    title: 'Use as much as you like',
    icon: 'sliders',
    summary: 'Turn features on or off',
    body: [
      'SpendLess works as a simple shopping list. Compare is there when you want it.',
      'Profile → Shopping features turns Where to buy and Tips on or off. Lists look exactly as before when they’re off.',
      'You can replay the Where to buy walkthrough from Profile → Help.',
    ],
  },
];

export const HELP_BY_ID = new Map(HELP_TOPICS.map((t) => [t.id, t]));
