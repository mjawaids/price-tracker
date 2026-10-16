# Roadmap

Where SpendLess is heading, what was found when the app was reviewed in October 2026,
and what's planned. Start here in a new chat; `CLAUDE.md` describes the code as it is.

## Direction (Oct 2026)

- **Intuitive and self-explaining**: a smooth, uncluttered flow with only the features
  people use, so they keep using it instead of churning.
- **Global audience**: no longer Karachi/Pakistan-only.
- **Some small revenue eventually**: pricing is being worked on separately; leave
  `/pricing` alone unless asked.

Usage on 2026-10-16 (read-only SQL):
- 1 person with lists, 2 lists
- 4 people who reported prices
- 17 usuals
- 0 plans applied

Regions: all 9 are PK/PKR; only Karachi is `live`.

## UX/retention review (2026-10-16)

Each finding was checked against the code or the live data.

### 1. Nothing explains what the app is for

- `AuthScreen.tsx` still describes the old product ("Add your favourite products and the stores you shop…").
- After sign-in there's no welcome or value screen (`OnboardingContext.tsx`: "Lists teach themselves").
- The savings pitch (the Where to buy walkthrough) appears only on the first visit to `PlanScreen`.
- The city picker never opens on its own on first run.

### 2. Back doesn't work like an app

- There is no browser-history integration: no `pushState` or `popstate` in `src/`. The URL stays `/` on every screen.
- In the installed Android app, hardware back very likely leaves the app instead of going back a screen. This was inferred from the code, not tested on a device.
- Sheets don't close on back, and the sheet drag handle does nothing.
- A receipt review lives only in memory, so leaving the app this way loses it.
- Changing tabs resets the stack and scrolls to the top.

### 3. Too many surfaces

- The app has 11 screens, 27 sheet components, 3 tabs plus a 3-way Compare control, and 6 switches.
- Profile → Notifications → "Push notifications" is dead: `settings.notifications` is read by nothing.
- The Compare tab shows everywhere, even where there is nothing to compare.
- Every feature is on by default (`SettingsContext.tsx`).

### 4. Not ready for a global audience

- Currency is hard-coded to PKR. `getDefaultCurrency()` in `src/utils/currency.ts` is never called.
- Copy uses Karachi examples ("Was it Rs 210?", Imtiaz, atta).
- There's no i18n: `settings.language` is unused.

### 5. Text cut off

There are 30+ `truncate` spans with no way to see the full text. The worst:

| What gets cut | Where |
|---|---|
| Item names | `listParts.tsx` |
| Store names, which lose a branch's area | `compareParts.tsx` `StoreName` |
| Plan option labels | `PlanScreen.tsx` |
| Chosen product lines | `PlanScreen.tsx` |

Some `whitespace-nowrap` buttons overflow at 360px.

### 6. Quantity

- Quantity is only − / + in `ItemSheet`, with no box to type in.
- The step is always 1, so "500 g" + becomes 501 g.

### 7. Aisles

- An item's aisle can be changed, but only through the Aisle chips in `ItemSheet`.
- There is no drag and drop.

### 8. No retention measurement

- GA sends only `page_view`, install events and `onboarding_dismissed`.

### 9. Wrong matches

Found while looking into eggs being matched with noodles:

- **Picker fallback**: with no products of the item's type, the item choice sheet showed any product sharing *one* word with the item, under "Eggs at your stores".
- **Wrong types**: an egg pudding, dog food, a biscuit and "Cocos World Egg" were typed as eggs.
- **Wrong pack sizes**: "Omega 3 Eggs 12 Pieces" was stored as a pack of 3.
- **Store-by-store look**: the picker showed each store's price, and copies of the same product under slightly different names were separate rows.
- **Not reproduced**: in the live data no egg noodles were typed as eggs, so the exact noodles case wasn't confirmed. The fallback above is the likely path.

### What brings people back, in order

1. A first run that reaches "you'd save Rs X" quickly.
2. Back that works like any app.
3. Only the features that work where the person lives.
4. A reason to return: a "still to buy" reminder.
5. Bringing others in: invites now, shared family lists later.

## Decisions

- **Outside live cities the app is Lists-only.** Compare (Where to buy, receipts, price checks) is off with its tab hidden, and one Profile switch turns it on. A live city gets everything, as before.
- **Sharing this round is an invite link** (share sheet or copy, with a random invite code). Shared family lists come later.
- **Push** ("still to buy") goes out once when a list's oldest open item is 2+ days old, then stays quiet until the list changes, only 10:00–20:00 local time. OneSignal is set up the way DailyWins does it (`mjawaids/daily-accomplishments`: `src/lib/onesignal.ts`, its worker at `/onesignal/` scope, an opaque `push_alias`).
- **The usual-product picker shows each product once, with no prices or stores.**
- **UI work gets a Claude Design pass first**, and the direction is confirmed with the owner.

## Planned PRs (this round)

| # | What | Status |
|---|---|---|
| 1 | Correct matches (eggs need 6+ units, Omega-3 isn't a count, pudding / pet food / Gala typed); the picker shows one row per product with no prices or stores, and its fallback needs every word; migration `20261016000000_egg_products.sql` fixes 13 shared rows; this roadmap | In review |
| 2 | Back and gestures: history integration in `AppContext`, sheets close on back, swipe down closes a sheet, left-edge swipe goes back, asks before leaving a receipt review, scroll kept | Planned |
| 3 | Lists: a typed quantity box with steps that follow the unit; long-press drag between aisles (`@dnd-kit/core`); no cut-off text | Planned |
| 4 | Region gating (above); a first-run welcome and city step; currency from the browser locale; neutral copy; dead push switch removed; retention analytics events (counts only) | Planned |
| 5 | Invite a friend: `navigator.share` / copy; `spendless.invite_codes` + `spendless.referrals` with own-row RLS | Planned |
| 6 | "Still to buy" push via OneSignal: `spendless.push_settings`, a script-only `notification_log`, an hourly GitHub Actions sender. Needs a OneSignal app, `VITE_ONESIGNAL_APP_ID` and the `ONESIGNAL_REST_API_KEY` secret | Planned |

## Later (each in its own chat)

### Shared family lists

The strongest retention feature for list apps. Today everything is per owner:

- RLS on `lists` and `list_items` is `auth.uid() = user_id` (`supabase/migrations/20261003000100_lists.sql`).
- Offline sync pulls by `user_id, updated_at` (`lists_user_updated_idx`, `list_items_user_updated_idx`).

The feature needs:

- a membership table;
- RLS by membership;
- a sync pull by membership;
- an invite flow, which can reuse PR 5's codes.

### i18n

- There's no library yet, and all strings are inline English.
- `src/lib/categories.ts`, `src/lib/groceryDictionary.ts` and `src/lib/compare/itemTypes.ts` are tuned for Pakistan (English plus romanized Urdu).

### Pricing / a paid tier

- `/pricing` is static copy for the old product.
- The legal pages name Paddle as the Merchant of Record.
- There's no payment code or subscription flag anywhere.

### Automatic duplicate merges

The nightly job merges only exact same name + size within 25%; other pairs need approval in *Catalog jobs* → `merge-products`. `resolve.ts` `sameProductKey()` (brand + type + total size + variant words) is a candidate signal for merging more pairs automatically, with the same price-agreement check.

### Parked from before

- "Twin pack" names read as a single pack (86 products).
- City readiness meter.
- Till-receipt tuning on full-size photos.
- Moderation queue.
