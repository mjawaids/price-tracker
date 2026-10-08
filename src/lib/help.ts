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
      'Some online stores’ prices are read from their own websites every day or every few days.',
      'A price you add is used for you straight away (for 30 days), unless a newer one comes in from someone else.',
      'Every price carries a chip with how old it is: green for today or the last couple of days, grey up to a month, and amber “Old” after that. Prices change — if you see a different one, add it.',
      'Price looks wrong? On a product’s page, tap Wrong price? next to a shared store’s price: add the price you saw, say they don’t sell it any more, or just say it’s wrong. When someone else says it’s wrong too, the price is marked and Where to buy leaves it out until someone adds a newer one.',
    ],
  },
  {
    id: 'stores',
    title: 'Your city and stores',
    icon: 'store',
    summary: 'Choosing what gets compared',
    body: [
      'Pick your city once. Where shared prices are live, its stores are added for you. Anywhere else, Compare uses the stores and prices you add yourself.',
      'Where to buy compares your city’s online stores and your own stores. In Compare → Stores, choose the ones you actually shop at — Where to buy then compares only those.',
      'Shared shop branches (like “Imtiaz · Gulshan”) show their prices everywhere, but Where to buy compares a branch only once you add it to My stores — so a plan never sends you across the city.',
      'Add a store of your own (a local shop or a delivery app) with its delivery fee and minimum order. Stores you add are private to you, unless you share a shop — see Sharing a shop.',
    ],
  },
  {
    id: 'shared-shops',
    title: 'Sharing a shop',
    icon: 'users',
    summary: 'Turn a shop you added into one everyone sees',
    body: [
      'A shop you added yourself (one you walk into) can become a shared shop, so everyone in your city sees its prices. Open it in Compare → Stores and tap Share this shop, then give the shop’s name and its area the way others know them.',
      'When enough different people who shop there suggest the same shop, it becomes shared overnight. If it’s already shared (say, a chain’s branch), pick it from the list and your shop moves into it.',
      'When that happens, your prices there are copied to the shared shop, without your name, like any price at a shared store. It replaces your own copy in My stores and on your lists, and your own copy is closed. Delivery details aren’t shared.',
      'Until then nothing changes, and you can withdraw the suggestion from the shop’s sheet.',
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
      'To keep shared prices honest, a price far from the usual one at a shared store is used for you only at first. It counts for everyone once someone else sees about the same price there (another person, or the store’s own website). Adding a new price for the same product and store within 10 minutes replaces your last one, and you can add up to 500 prices a day.',
      'Prices from people whose prices usually match what others see count a little more; prices that often don’t match count a little less. It’s worked out automatically, never shown, and everyone starts the same.',
      'Your own stores and products — and the prices you add to them — stay private, unless you share a shop (see Sharing a shop).',
      'Shopping with a plan? When you tick an item, SpendLess asks “Was it Rs 210?” — tap Yes, or Different to add what you paid (or that they didn’t have it). When a store’s part of the list is all ticked, the ones you didn’t answer come up together. Offline in the shop, your answers wait on this device and are sent when you’re back online. Turn it off in Profile → Shopping features → Ask for prices while I shop.',
      'Compare → Contribute → Your contributions lists the prices you’ve added and where each one stands. Got one wrong? Remove it there (it asks first).',
      'Have a receipt? Add a whole shop’s prices in one go — see Adding a receipt.',
    ],
  },
  {
    id: 'receipts',
    title: 'Adding a receipt',
    icon: 'receipt',
    summary: 'A whole shop’s prices from a screenshot, PDF, photo or text',
    body: [
      'In Compare → Contribute, tap Add a receipt. Pick one or more screenshots of an online order, pick a PDF invoice, take a photo of a till receipt, or paste the text of an order email or message.',
      'In the installed app on Android, you can also share a screenshot, a PDF or an order’s text to SpendLess from another app (Share → SpendLess). Sharing opens the app afresh, so save a receipt you’re checking first. On iPhone, use Add a receipt instead.',
      'The receipt is read on your device. The first time you add a picture (or a PDF that’s a scan), SpendLess downloads its text reader once (about 6 MB); a PDF’s own text needs a smaller download (about 2 MB). After that it works offline. Receipts are never uploaded. Something you share to SpendLess stays on this device until you read it or tap Not now.',
      'Check what we found. Lines that match a product at that store are ticked. Check this and Which product is this? need you to confirm or pick the product. Fees, discounts and payment lines are left out. Tap a line to fix its price or quantity.',
      'Prices are saved for the receipt’s date, as the price for one after the item’s own discount. Receipts from the last 90 days can be added, and Undo takes them back.',
      'Medicines are saved as your own products, so only you see their prices. A shop you add yourself is private too, until you share it.',
      'The products you pick for a store’s receipt lines are remembered on this device, so next time they match on their own.',
    ],
  },
  {
    id: 'features',
    title: 'Use as much as you like',
    icon: 'sliders',
    summary: 'Turn features on or off',
    body: [
      'SpendLess works as a simple shopping list. Compare is there when you want it.',
      'Profile → Shopping features turns Where to buy, Receipt import and Tips on or off. Lists look exactly as before when they’re off.',
      'You can replay the Where to buy walkthrough from Profile → Help.',
    ],
  },
];

export const HELP_BY_ID = new Map(HELP_TOPICS.map((t) => [t.id, t]));
