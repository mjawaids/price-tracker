# SpendLess (price-tracker)

Mobile-first shopping app with two sections:
- **Lists** (default): quick grocery/shopping lists — type "bread" or "2 milk" and
  go; no brand/size needed. Works fully offline and syncs when back online.
- **Compare**: "Where to buy" — for any list, the stores that make it cheapest
  (delivery fees and minimum orders included); an accepted plan splits the same list
  into store sections. Prices come from a shared catalogue (live cities, Karachi first)
  plus each user's own stores, products and prices. Every Compare feature is optional.
Live at https://spendless.ibexoft.com

## Tech Stack
- React 18 + TypeScript + Vite + Tailwind CSS
- Supabase (PostgreSQL + Auth + RLS)
- Lucide React icons, React Router 7

## Commands
- `npm run dev` — start dev server
- `npm run build` — typecheck + production build (output: `dist/`)
- `npm run typecheck` — TypeScript check only, app + `vite.config.ts` + `scripts/import`, `scripts/seed` (`vite build` alone doesn't type-check)
- `npm run lint` — ESLint (no test framework; manual testing only)
- `npm run generate:icons` — regenerate PWA/favicon icons
- `node scripts/check-contrast.mjs` — WCAG contrast check for the colour tokens (run after editing them)
- `node scripts/check-migrations.mjs` — fails if a migration touches anything outside the `spendless` schema
  (only exception: `spendless-…` policies on `storage.objects`)
- `SUPABASE_DB_URL=… scripts/db-migrate.sh [--dry-run] <dir>` — apply migrations (CI does this on deploy)
- `SUPABASE_DB_URL=… node --experimental-strip-types scripts/seed/promote-store.ts --store-id <id> --chain <name> [--apply]`
  — make a private store public (normally run from the manual *Catalog jobs* workflow; dry run without `--apply`)
- `SUPABASE_DB_URL=… node --experimental-strip-types scripts/seed/add-branches.ts [--file scripts/seed/branches/karachi.json] [--apply]`
  — add/update a city's public in-store branches from the reviewed list (*Catalog jobs*, job `add-branches`; dry run without `--apply`)
- `node --experimental-strip-types scripts/import/run.ts --dry-run [--source <id>|all] [--max-pages N]` — daily store
  price import, fetch + parse only (needs `NODE_USE_ENV_PROXY=1` behind a proxy). Without `--dry-run` it needs
  `SUPABASE_DB_URL` and writes; normally run by the *Price import* workflow

## Environment Variables (`.env`)
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GA_MEASUREMENT_ID=   # optional
VITE_GA_ENABLE_IN_DEV=false
```

## Architecture

### State Management
Context-based (no Redux). Providers in `src/contexts/`:
- `AuthContext` — session, login/logout; caches the last identity so the app opens offline
- `ListsContext` — Lists section: lists/items, quick add, suggestions, sync status (offline-first)
- `CompareContext` — the catalogue for the user's city (regions, stores, products,
  current prices with the user's own newer reports overlaid), "my stores", usuals
  (`item_preferences`), plans this month; `consideredStores` (what Where to buy and "your
  stores" prices use: the picks, else `defaultStoreIds` = active stores minus shared
  in-store branches, i.e. online stores + the user's own; a branch counts once picked);
  `planFor(items)` (resolve + optimize), writes
  (own stores/products, price reports), the one-time Compare cart → list conversion.
  Receipt saves: `reportPrices` (one `spendless.save_receipt` call per receipt — new
  private products for its medicines and all its prices in one transaction, all or
  nothing; maps the daily limit / a refused row / offline to a reason), `retractReports`
  (Undo), `pricesAtStore`, `ownReportsAt` ("Already added").
  Cached per user in IndexedDB (`src/lib/compare/cache.ts`) so plans work offline
- `AppContext` — navigation stack, section, screen enum, app-level sheets
  (`currency`, `region`, `help` + topic), sign-out
- `OnboardingContext` — Where to buy walkthrough (`ONBOARDING_VERSION`, opened from
  `PlanScreen`) + contextual tips (`useHint`)
- `SettingsContext` — currency, `regionId` (null = not chosen, `'other'` = a city
  without shared prices), `features` (`whereToBuy`, `askPrices`, `receipts`; Profile →
  Shopping features), `groupListsByAisle` (Lists: aisle groups vs order added; switch in
  the list options sheet). Persisted to localStorage, read on first render. `location`
  is legacy (mapped to `regionId` once)
- `ThemeContext` — light-only
- `AnalyticsContext` — gtag wrappers

### Key Hooks
- `useBreakpoint()` — returns `{ compact, isTablet }` for responsive logic
- `useFmt()` — money in the user's currency (`formatPrice`: "Rs 2,800", cents only when
  non-zero); Compare uses `compare.fmt`, which prices in the city's currency
- `useHint(id, when)` — one-at-a-time contextual tips (copy in `src/lib/hints.ts`)

### Where to buy (Lists ↔ Compare)
- A list shows a **Where to buy** chip (hidden when the feature is off) → `PlanScreen`:
  Cheapest · One stop · Delivered · Fewer stops (missing or duplicate choices hidden),
  savings vs the best single store, "We picked these" (assumed products), per-store
  cards. *Use this plan* → `ListsContext.applyPlan` writes `plan_*` on each item and
  `recordPlan` stores the savings.
- With a plan applied the list gets a Stores/Aisles switch, store sections
  (`listCompare.tsx`, `groupByStore`), *Shop here* focus and an *Open* link for online
  stores (`storeLink()`, http(s) only).
- An item's product: pinned (`list_items.product_id`, "Just this time") → usual
  (`item_preferences`) → named in the text → assumed (last bought, else most carried).
  `ItemChoiceSheet` (`compareSheets.tsx`) changes it.
- Help: `src/lib/help.ts` topics in a lazy `HelpSheet` (`app.openSheet('help', id)`);
  `WhatsNewSheet` once per existing user (`spendless-whatsnew:<uid>`).

### Receipts (Compare → Contribute → Add a receipt)
`ReceiptScreen` (lazy, screen `receipt`; off with `features.receipts`). Steps: start
(screenshots/images, a camera photo on touch devices, or pasted text) → one-time reader
download sheet → reading (progress, Cancel) → review → saved (Undo), plus problem cards
(too old, nothing found, couldn't open a picture, reader didn't start, offline, couldn't
save, daily limit, feature off). The receipt in progress lives in a module store
(`session.ts`, memory only), so reading carries on when the user leaves the screen and
Contribute shows "Finish your receipt". Everything runs on the device:
- **Read** (`flow.ts`): pasted text, or images via `ocr.ts` — tesseract.js in a Web
  Worker, loaded only when needed and **self-hosted** (never a CDN): `vite.config.ts`
  copies the worker, the LSTM engines (`.js` + `.wasm`, plain/SIMD/relaxed-SIMD) and
  `eng.traineddata.gz` (4.0.0_best_int) from `node_modules` into
  `dist/ocr/<tesseract.js version>/` (dev serves the same list). Not precached
  (`globIgnores: ['ocr/**']`, ≈6 MB): a runtime `CacheFirst` cache (`spendless-ocr`)
  keeps it after the first use; `public/_headers` makes `/ocr/*` immutable.
  `VITE_OCR_PATH` / `VITE_OCR_BYTES` come from the config; `OCR_MB` is the size shown
  before the one-time download. `image.ts` uprights, resizes, greys and stretches the
  image (dark screenshots inverted); `layout.ts` joins the reader's split rows. Up to 6
  pictures of one order are read as one receipt ("Add another screenshot" appends). The
  image is never uploaded or kept.
- **Parse** (`parse.ts`, plain TS): items (name, quantity, price for one after the
  item's own discount), fees, discounts, totals; numbers are explained by arithmetic
  (qty × rate − discount = total) rather than layout templates. `addsUp` checks the items
  against the printed subtotal/total. `dates.ts` finds the purchase date (day-first
  unless an FBR/receipt number says otherwise; ambiguous dates are flagged; >90 days
  can't be saved). `stores.ts` guesses the chain, online vs in-store, pharmacy, area;
  `receiptHelpers.storeForGuess` picks the store only when exactly one fits (same kind —
  an in-store receipt never goes to the online store; with several branches, the printed
  area decides), else the one last used for that chain (`memory.ts`), else the store
  picker opens (`storePicker.tsx`, filtered to the chain).
- **Match** (`match.ts`): IDF word overlap, brand, size, type, price at that store.
  Picked on its own only from the store's own products, when every telling word matches
  both ways (packaging words aside), same size, near the store's price, and well ahead
  of the next; otherwise up to three suggestions. Tuned so wrong automatic picks stay
  ~0 (harness numbers in the PR).
- **Review** (`review.ts` + `receiptHelpers.useReview`): Ready / Check this / Which
  product is this? / Medicines · only for you / Already added (the user's own report for
  that product, store and day) / Not products (fees, discounts, payment, lines marked so).
  Medicines (`medicine.ts`: PHARMACY section, medicine code, strength like "500mg";
  weaker signals only when the line doesn't match a shared product) are saved as the
  user's own private products, so their prices stay private (`current_prices` needs both
  store and product visible). Edits (product, price, quantity, tick, not a product) are
  kept per line in the session.
- **Remember** (`memory.ts`, IndexedDB `spendless-receipts-<uid>`, this device only):
  the product (or "not a product") the user chose per line per chain, and the last store
  per chain. Deleted on sign-out.
- **Save** (`receiptHelpers.saveReceipt`): `CompareContext.reportPrices` →
  `api.saveReceipt` → `rpc('save_receipt')`, the SQL function
  `spendless.save_receipt` (migration `20261007120000`, SECURITY INVOKER, so RLS and
  the report trigger apply). In one transaction it makes a private product for each
  medicine without one, reusing the user's own product with the same name (spaces and
  case ignored, `api.productKey`), then inserts every price (`source 'receipt'`, one
  row per product, `observed_at` = local noon of the receipt date, or now). The daily
  limit or a refused row rolls everything back, new products included. The review shows
  a medicine the user saved before as their product. Then the choices are remembered.
  Analytics are counts only (`receipt_read`, `receipt_failed`, `receipt_saved`,
  `receipt_undone`).

### Offline (Lists)
- `src/lib/offline/db.ts` — IndexedDB (`idb`) per user: `lists`, `items`, `outbox`, `meta`
- `src/lib/offline/sync.ts` — every change is a full-row upsert queued in `outbox`;
  `flush()` pushes (lists before items), `pull()` fetches rows with `updated_at` >
  cursor. Last write wins; rows with unsent local edits are never overwritten.
- Ids are generated on the device; deletes are soft (`deleted_at`).
- Service worker (vite-plugin-pwa) precaches the app shell and caches Google Fonts
  (and, after first use, the receipt reader under `/ocr/`).

### App updates (new deploys)
- `registerType: 'prompt'` in `vite.config.ts`: a new deploy's service worker installs
  and **waits**. `src/components/shell/UpdatePrompt.tsx` (mounted in `src/main.tsx`, so
  every route) registers it via `virtual:pwa-register/react`, checks for a new
  `sw.js` hourly, on return to the app and on reconnect, and shows a top toast
  "A new version is ready · Update". Tapping it activates the new worker and reloads.
  Coming back after ≥30 min in the background with an update waiting applies it
  automatically — unless a receipt is being read or reviewed (`isReviewOpen()` in
  `src/lib/receipt/session.ts`; it lives only in memory). A cold start always gets the
  newest build.
- Cache invalidation: Workbox precache entries are revisioned per build and old ones
  are removed when the new worker activates. `public/_headers` makes Netlify serve
  `/`, `/index.html`, `/sw.js` and `/site.webmanifest` as `no-cache` and the hashed
  `/assets/*` as immutable. `src/main.tsx` reloads once on `vite:preloadError` (a tab
  on an old build asking for a chunk the new deploy removed).
- Lists data survives the reload (IndexedDB + outbox), and so does the Compare
  catalogue snapshot (IndexedDB); the navigation stack starts fresh.
- Offline, Compare reads the saved snapshot (Where to buy and prices work, with an
  offline note); adding stores, products and prices needs a connection.

### Installing the app (PWA)
- `src/lib/install.ts` (imported first thing in `src/main.tsx`) keeps the browser's
  `beforeinstallprompt` event, tracks `appinstalled`, detects standalone mode and the
  platform, and exposes `useInstall()` / `promptInstall()`. It's a module store, not a
  context, so it works signed out too. `spendless:installed` in localStorage remembers
  an install and is cleared when the browser offers to install again (= uninstalled).
- `src/components/shell/Install.tsx`: `InstallSheet` (one-tap install on Chromium, else
  steps for iOS / Mac Safari / Android / desktop / other), plus the entry points:
  - `InstallButton` — sign-in screen (signed out).
  - `InstallBanner` — top of the Shell; only when installing is a tap away (Chromium
    offer or iOS) and not installed (`bannerVisible()`); "Not now" or closing the
    steps snoozes it 14 days (`bannerSnoozed` in the store).
  - `InstallSidebarCta` — "Get the app" card above the profile button in the
    desktop sidebar (icon button on the tablet sidebar); always there until installed.
    On windows ≤860px tall it shrinks to a one-row "Install the app" button.
  - `InstallPill` — small "Get app" pill in the mobile Lists header; steps aside
    while the banner is showing.
  - Profile → **App** → *Install the app* / *Install the app again*.
- Each one opens the browser's dialog when it can, else the sheet. Everything is
  hidden inside the installed app.

### Navigation
Stack-based within `AppContext`. Screen enum values: `lists`, `plan` (Where to buy,
`{ listId }`), `prices`, `search`, `detail`, `stores`, `contribute`, `mproducts`,
`receipt` (Add a receipt, highlighted as Contribute), `profile`.
Sections (`app.section` / `app.openSection`): `lists` (default; includes `plan`),
`compare` (opens `prices`), `profile`.
- Mobile (<768px): bottom tab bar **Lists · Compare · Profile**; Compare has a
  Prices · Stores · Contribute segmented control (Contribute → Your products, Add a receipt)
- Tablet (768–1099px): collapsed sidebar
- Desktop (≥1100px): full sidebar (your lists on top, then Compare: Prices, Stores,
  Contribute); Compare screens get a top bar with search and the city
- Sidebar nav scrolls (scrollbar hidden) above the pinned install card + profile;
  `useNavOverflow` in `Shell.tsx` shows edge fades and a "More ⌄" button when items are hidden
- Code splitting: `Shell.tsx` lazy-loads every screen except Lists (Suspense skeleton)
  and the region/help sheets; `ListsScreen` lazy-loads the item choice sheet;
  `src/pages/lazy.ts` lazy-loads the legal/pricing pages and `/bot` (what SpendLessBot is). The service worker
  precaches all chunks, so lazy screens still open offline.

## Database (Supabase — schema `spendless`, all tables have RLS, data is per-user)

### Own schema — the Supabase project is shared with other apps
SpendLess lives in the Supabase project "Universal Project for Apps", which other
apps also use (their tables, e.g. `accounts`, `goals`, `profiles`, `transactions`,
are in `public`). SpendLess data must never mix with theirs:
- **Every SpendLess database object lives in the `spendless` schema** — tables,
  functions, triggers, views. Migrations schema-qualify everything
  (`spendless.products`, `CREATE SCHEMA IF NOT EXISTS spendless`); never rely on the
  default `public`.
- **Never create, alter or drop anything in `public` or another app's schema**, and
  never touch other apps' tables or functions (`accounts`, `goals`, `profiles`,
  `transactions`, `public.handle_new_user`, `public.update_updated_at_column`).
  The only exception is the temporary rollout views from
  `20261003000000_spendless_schema.sql`, removed by
  `supabase/post-deploy/20261003000200_*`.
- The client is pinned to the schema in `src/lib/supabaseClient.ts`
  (`createClient(url, key, { db: { schema: DB_SCHEMA } })`, `DB_SCHEMA = 'spendless'`);
  don't create other clients without it.
- New tables need grants in their migration (`GRANT ALL ON spendless.<t> TO anon,
  authenticated, service_role`) plus RLS. Exception: system tables only the importer
  uses (`store_listings`, `import_runs`) have RLS on, **no policies**, and are revoked
  from `anon`/`authenticated` (granted to `service_role` only). `spendless` must stay listed in Dashboard →
  Project Settings → Integrations → **Data API** → *Exposed schemas* (the pipeline
  adds it automatically), or the API can't see it.
- `auth.users` is shared by all apps in the project (that can't be split without a
  separate project). Keep app data in `spendless` tables, not in other apps' tables.
- Storage buckets are project-wide, so SpendLess's are named `spendless-…`
  (`spendless-avatars`, `spendless-product-images`; names live in
  `src/lib/storage.ts`), and so are their policies on `storage.objects`
  (`"spendless-avatars: owner insert"`). Both are public (files are read by URL);
  users may only write, list and delete inside their own `<user id>/` folder.
  Creating them is a migration (`INSERT INTO storage.buckets`); deleting one needs
  `SET LOCAL storage.allow_delete_query = 'true'` and an empty bucket.
- Schema changes ship **only through the deploy pipeline** (merge to `main`): add a
  migration file, never change the live database by hand. Before writing one, check
  what's live (Supabase MCP `list_tables`, read-only SQL). Applying anything to the
  shared project outside the pipeline needs the user's explicit OK.
- Migration files: `<YYYYMMDDHHMMSS>_<name>.sql`, never edited once deployed.
  `supabase/migrations/` = additive, runs before the new app goes live;
  `supabase/post-deploy/` = destructive cleanup the old app still needed, runs after.
  Tracked in `spendless.schema_migrations` by `scripts/db-migrate.sh` (not
  `supabase db push` — the shared project's history includes other apps).

| Table (`spendless.*`) | Key Columns |
|-------|------------|
| `products`, `stores` | legacy per-user catalogue (prices in a `products.prices` jsonb column); copied into the catalogue, no longer read by the app |
| `shopping_lists` | legacy: the old Compare cart, read once to turn it into a list ("From Compare cart") |
| `lists` | id (device-generated), user_id, name, sort_order, updated_at (server-set), deleted_at |
| `list_items` | id, list_id, user_id, name, quantity?, unit?, note?, category?, done, done_at, cleared_at, product_id? (→ `catalog_products`, the pinned product), plan_store_id?, plan_product_id?, plan_price?, updated_at (server-set), deleted_at |
| `regions` | id (slug, e.g. `karachi`), name, country_code, currency, status (`live` \| `gathering`) |
| `catalog_stores` | id, **owner_id** (NULL = public, else private), region_id, chain, name, kind (`physical`\|`online`), address, phone, city, lat/lng, delivery_rule (+`minOrder`), website, status. Public `physical` = a shared in-store branch (`<chain> · <area>`, same chain as the online store, from `scripts/seed/branches/`) |
| `catalog_products` | id, **owner_id**, name, brand, variant, item_type, category, size_value + size_unit (`g`\|`ml`\|`pc`, one unit), pack_count, unit_label, gtin, image_url, status, merged_into, match_key (importer: same product across stores; `''` = not confident) |
| `price_reports` | **append-only** for users: user_id (NULL = system import/feed), store_id, product_id, price (one pack), is_available, observed_at, source, status (`accepted`\|`pending`\|`rejected`). The importer moves its own latest `import` report's `observed_at` forward while a price is unchanged |
| `current_prices` | (store_id, product_id) → weighted-median price, observed_at, n_reports, confidence — written only by the `refresh_current_prices` trigger; a price with no counted reports left stays as a tombstone (`n_reports = 0`) so delta syncs drop it |
| *function* `save_receipt` | `spendless.save_receipt(store, observed_at, currency, items jsonb)` — a receipt's new private products (reusing same-named ones) + its price reports in one transaction; SECURITY INVOKER, EXECUTE for `authenticated` only |
| `user_stores`, `item_preferences`, `plans` | "my stores", a user's usual product per list item name, applied plans (savings) |
| `store_listings`, `import_runs` | importer only (clients can't read): each store's product id → our product, last price, last checked, `included`; one row per store per run (counts, status) |

**Compare catalogue (v2)**: `catalog_*`, `price_reports` and `current_prices` replace the
per-user `products`/`stores` (their rows were copied in as private rows with the same
ids). Public rows are read-only for clients; users write only their own private rows and
their own price reports (rate-limited, outliers held as `pending`). Full model, price
consensus and anti-spam rules: `docs/compare-data.md`. Public Karachi prices also come
from a daily import of five online stores (Hydri paused; `scripts/import/`, `docs/data-sources.md`); its 26
in-store branches (Imtiaz, Spar, Diamond) come from the chains' own store lists and get prices from people. Item types are a curated vocabulary
in `src/lib/compare/itemTypes.ts` (the column only checks the slug).

`delivery_rule` union: `none | free | flat { fee } | over { threshold, fee }` (catalogue
stores may add `minOrder`).

The legacy `products`, `stores` and `shopping_lists` tables are kept until a later
post-deploy migration drops them.

## Key Files

| Path | Purpose |
|------|---------|
| `src/types/index.ts` | Lists types (`GroceryList`, `ListItem`) and `DeliveryRule`; catalogue types are in `src/lib/compare/types.ts` |
| `src/lib/supabaseClient.ts` | Supabase client, pinned to the `spendless` schema |
| `src/lib/storage.ts` | Storage bucket names + `storagePathFromUrl()` |
| `src/lib/links.ts` | Outbound links with UTM tags: `supportUrl(placement)` → ibexoft.com/contact |
| `src/lib/compare/` | Compare v2 logic, plain TS shared with scripts: `itemTypes.ts` (item vocabulary), `productName.ts` (name → brand/type/variant/size; "50g+50g" = pack of 2), `units.ts` (unit prices, packs needed), `resolve.ts` (list item → products + priced options), `optimizer.ts` (1–4 store sets, delivery thresholds, min orders → cheapest / fewer stops / one stop / delivered + savings baseline), `describe.ts` (plan and price wording), `types.ts`; app-only: `api.ts` (Supabase reads/writes; `fetchPrices` asks for `STORE_CHUNK` stores per request), `cache.ts` (IndexedDB snapshot) |
| `src/contexts/CompareContext.tsx` | Compare state, sync, `planFor`, writes, receipt saves, cart conversion |
| `src/lib/receipt/` | Receipt import, plain TS: `text.ts` (lines, money), `dates.ts`, `parse.ts`, `stores.ts`, `medicine.ts`, `abbrev.ts` (till shorthand), `match.ts`, `review.ts`, `layout.ts` (reader rows → lines); app-only: `image.ts`, `ocr.ts` (self-hosted tesseract.js), `flow.ts` (read → parse → session), `session.ts` (the receipt in progress, memory only), `memory.ts` (remembered line choices + last store per chain, IndexedDB) |
| `src/components/screens/ReceiptScreen.tsx` | Add a receipt (+ `receiptParts.tsx`, `receiptSheets.tsx` for the reader download, paste, date, store, product and line sheets, `receiptHelpers.ts` for the review rows, store guess and save) |
| `src/components/screens/PlanScreen.tsx` | Where to buy for a list |
| `src/components/screens/PricesScreen.tsx`, `SearchScreen.tsx`, `DetailScreen.tsx` | Compare home, product search, product page (*Add to list* pins the product) |
| `src/components/screens/StoresScreen.tsx`, `ContributeScreen.tsx`, `ManageScreens.tsx` | Stores (online, your own, branches grouped by chain with a search), add a price (and the Add a receipt entry), your own products |
| `src/components/screens/compareSheets.tsx`, `productSheet.tsx` | Item choice, city, My stores (`StoresSheet`: online, your shops, branches by chain), store form (a branch: address, phone, *Add to My stores*), add a price (*Another store…*); product form |
| `src/components/screens/storePicker.tsx` | Shared store picker (`StorePickerSheet`: Online / In a shop, search over name, chain and address, branches grouped by chain), `ChainGroup`, `StoreSearch` — used by receipts, Add a price, My stores and the Stores screen |
| `src/lib/help.ts`, `src/components/shell/HelpSheet.tsx` | In-app help topics |
| `src/components/onboarding/` | Where to buy walkthrough (`steps.ts`) and `WhatsNewSheet` |
| `docs/compare-data.md` | Compare data model, price consensus, anti-spam, regions, data sources |
| `docs/data-sources.md` | Each imported store: robots.txt, terms checked, method, branch, delivery source; stores not imported and why |
| `scripts/import/` | Daily price import: `run.ts` (CLI), `sources.ts` (stores, delivery rules, caps, `paused`), `adapters/` (Magento GraphQL, Hydri, Imtiaz menu, Blink product pages), `http.ts` (polite client: honest UA, robots.txt, 1 req/s, stop on a block; redirects followed by hand, each target checked for same site + robots.txt before it's requested), `robots.ts`, `aisles.ts` (what we leave out + aisle → category; pharmacy-typed products left out in any aisle, minus cosmetic look-alikes; mixed aisles decided per product name; `RULES_CHANGED_AT` re-reads listings newly included), `normalize.ts` (name → product + `match_key`), `keys.ts` (re-keys public products no listing keys, e.g. Panda Mart's, before the stores run; fills a missing brand/type from the name, keeps stored ones), `write.sql` (one transaction per store; re-checks each listing's product: key changed → re-match or re-key its own product in place (a blank key clears it), price outside ⅓×–3× of other stores' → held apart, a pack clash — pouch/refill vs jar/bottle/tin in the names — never joins), `db.ts` |
| `src/pages/Bot.tsx` | `/bot`: what SpendLessBot does and how to opt out (its user agent links here) |
| `scripts/seed/promote-store.ts` | Make a private store + its products public (with consent); run via `.github/workflows/catalog-jobs.yml` |
| `scripts/seed/add-branches.ts` (+ `add-branches-read.sql`, `add-branches-write.sql`, `branches/<city>.json`) | A city's public in-store branches from a reviewed list (fixed ids; validates, dry run, one transaction; never deletes or touches private/online stores); job `add-branches` in `catalog-jobs.yml` |
| `src/utils/currency.ts` | 50+ currencies, formatting, default currency from the browser locale |
| `src/lib/categories.ts` | 15 canonical categories (tuned for Pakistan market) |
| `src/components/shell/Shell.tsx` | Adaptive layout shell + screen routing |
| `src/components/shell/UpdatePrompt.tsx` | Service worker registration + "new version" prompt |
| `src/lib/install.ts`, `src/components/shell/Install.tsx` | "Install the app" state, sheet, button, banner, sidebar card and mobile pill |
| `public/_headers` | Netlify cache headers (no-cache HTML/SW, immutable `/assets/*` and `/ocr/*`) |
| `src/components/screens/ListsScreen.tsx` | Lists section (+ `listParts.tsx`, `listSheets.tsx`, `listHelpers.ts`, `listCompare.tsx` for the Where to buy chip, plan banner and store sections) |
| `src/contexts/ListsContext.tsx` | Lists state + offline sync wiring |
| `src/utils/quickAdd.ts` | Parses "2 milk", "milk x2", "atta 10 kg" |
| `src/lib/groceryDictionary.ts` | Item → aisle (English + romanized Urdu) |
| `supabase/migrations/`, `supabase/post-deploy/` | Schema history (pre-/post-deploy) |
| `.github/workflows/ci-cd.yml` | CI checks + production deploy pipeline |
| `scripts/db-migrate.sh` | Migration runner (tracks `spendless.schema_migrations`) |
| `docs/deployment.md` | Deployment runbook, setup, rollback |

## Conventions
- **Naming**: PascalCase components/types, camelCase hooks/utils, kebab-case CSS vars
- **Styling**: Tailwind utilities only; OKLCH design tokens via CSS vars (`--paper`, `--surface`, `--ink`, `--accent`); no CSS Modules
- **Responsive**: mobile-first; Tailwind breakpoints `md:` (768px), `lg:` (1024px)
- **Touch**: 48px min touch targets, 16px font on inputs (prevents iOS zoom)
- **Error handling**: try/catch with `console.error`; graceful fallbacks to empty arrays
- **Analytics**: always guard with `window.gtag` check before calling
- **Outbound links**: tag with `utm_source=spendless&utm_medium=referral`; the support
  link always comes from `supportUrl()` (`src/lib/links.ts`), never a hand-built URL or
  an email address

## Security
Always follow security best practices — in code, migrations, CI config and docs.
Security is never traded for convenience or speed; if a request would weaken it,
say so and propose a safe alternative.
- **Secrets**: never commit secrets, keys, tokens or DB URLs (`.env` is git-ignored;
  `.env.example` holds placeholders only). Only the Supabase **anon** key belongs in the
  client — never a `service_role` key or `SUPABASE_DB_URL`. CI secrets stay in the
  GitHub `production` environment; never echo them in logs.
- **Data access**: RLS is the security boundary, not the UI. Every new `spendless`
  table gets RLS enabled plus policies scoped to `auth.uid() = user_id` in the same
  migration; never disable RLS or add `USING (true)` policies on user data. Never trust
  a client-supplied `user_id` without a policy that enforces it.
- **Database functions**: avoid `SECURITY DEFINER`; if one is truly needed, pin
  `SET search_path` and keep it in `spendless`. Never build SQL from string
  concatenation — use the Supabase client's query builder or parameters.
- **Storage**: users may only write, list and delete inside their own `<user id>/`
  folder; keep policies that way. Validate file type and size before uploading.
- **Input & output**: treat all user input, URLs, imported data and synced rows as
  untrusted. Validate and length-limit on input; rely on React's escaping — no
  `dangerouslySetInnerHTML`, `eval`, `new Function` or unvalidated `href`/`src`
  (block `javascript:` URLs).
- **Auth**: use Supabase Auth only; never roll custom auth, store passwords, or put
  tokens in URLs. Keep sign-out clearing the cached identity, the user's offline
  lists (`AppContext.signOut` → `ListsContext.clearLocalData`, after a final sync), the
  cached catalogue (`CompareContext.clearLocalData`), recent searches, the receipt in
  progress (`resetReceipt`) and the remembered receipt lines (`deleteReceiptMemory`).
- **Privacy**: no PII or user content in analytics events, logs or error messages.
- **Dependencies**: add packages sparingly from reputable sources; keep the lockfile
  committed; check `npm audit` when adding or upgrading; no scripts from untrusted CDNs.
- **CI/CD**: least-privilege `permissions:` in workflows; pin actions to a version
  (third-party ones to a commit SHA); never run untrusted PR code with access to secrets.
- When reviewing or writing code, flag any security issue you spot (even outside the
  task) rather than silently leaving it.

## Deployment (CI/CD)
- `.github/workflows/ci-cd.yml`: PRs and pushes run checks (lint, contrast, migration
  guard, build). Pushes to `main` deploy: pre-deploy migrations → expose schema →
  build → Netlify → smoke test → post-deploy migrations → tag + GitHub Release.
- `.github/workflows/catalog-jobs.yml`: manual data jobs on the shared catalogue, picked
  by the `job` input (`add-branches`: a city's in-store branches; `promote-store`: a
  private store to public); dry run unless "apply" is ticked.
- `.github/workflows/price-import.yml`: daily store price import (03:17 Karachi), also
  manual with *source* / *dry run* / *max pages*. Scheduled workflows stop after 60 days
  without repo activity — re-enable from the Actions tab.
- Versions are **CalVer `YYYY.M.N`** from git tags (`N` = release count within the
  month, not the day), injected as `VITE_APP_VERSION` / `VITE_APP_COMMIT`
  (`src/lib/version.ts`, shown in Profile and set on `<html data-app-version>` in
  `src/main.tsx`, which keeps it in the entry bundle the smoke test checks). Don't hand-edit versions
  or commit version bumps.
- Secrets/variables live in the GitHub `production` environment; runbook, setup and
  rollback in `docs/deployment.md`. Bolt is no longer used — don't add Bolt files.
- New services go in as steps of the `deploy` job (see `docs/deployment.md`).
- SPA routing on Netlify comes from `public/_redirects`; keep it. Cache headers come
  from `public/_headers`; never give `sw.js` or `index.html` a long cache lifetime.

## Keep Docs in Sync
Docs are part of every change, not an afterthought:
- Any change to behaviour, features, setup, env vars, commands, scripts, database
  schema/migrations, project structure or UX updates the affected docs **in the
  same commit**: `README.md`, `CLAUDE.md`, `QUICK_START.md`, `TESTING_GUIDE.md`,
  `GA_TROUBLESHOOTING.md` and `docs/` (and any new doc you add).
- `CLAUDE.md` must always describe the code as it is now (architecture, key files,
  tables, conventions). `README.md` must always match what users and contributors see.
- Rewrite or delete docs that have gone stale rather than leaving them wrong.
- Before finishing a task, search the docs for anything that mentions what you changed
  (`grep -rn "<thing>" *.md docs/`) and fix every hit.

## Design & UX Standards
The bar is a modern, polished, top-tier app experience. Every UI change should look
and feel like it came from a strong product design team, not a default template.

### Principles
- **Mobile-first, app-like**: design for a phone in one hand first, then scale up to
  tablet and desktop. Keep primary actions within thumb reach; no hover-only behavior.
- **Clarity over decoration**: clear visual hierarchy, generous whitespace, one primary
  action per screen, scannable prices and savings (savings are the hero of the product).
- **Consistency**: use the existing tokens and primitives; never hard-code colors,
  radii, shadows or fonts. Extend the token set (`src/index.css` +
  `tailwind.config.js`) rather than adding one-off values.
- **Every state is designed**: loading (skeletons over spinners), empty (helpful copy
  + next action), error (plain-language message + recovery), and success feedback for
  every async action.
- **Motion with purpose**: short, subtle transitions (150–300ms) that explain change;
  respect `prefers-reduced-motion`.
- **Accessibility is non-negotiable**: WCAG 2.2 AA contrast, visible focus states,
  semantic HTML, labelled controls and icon buttons, keyboard navigable, screen-reader
  friendly; 48px touch targets and 16px input text (see Conventions).
- **Performance is UX**: fast first paint, no layout shift, optimistic updates where
  safe, lazy-load heavy screens.
- **Copy**: short, friendly, specific microcopy; money always formatted via `useFmt()`
  (or `compare.fmt` in Compare).

### Design System in Code
- **Tokens**: `src/index.css` (`--paper`, `--surface`, `--ink`/`--ink-soft`/`--ink-faint`,
  `--line`, `--accent` family, `--warn-*`, `--danger*`, `--ok-ink`/`--ok-wash` (success,
  e.g. "Adds up"), `--r-card`, `--r-btn`, `--shadow-card`)
- **Tailwind mapping**: `tailwind.config.js` (`bg-paper`, `text-ink-soft`, `rounded-card`,
  `rounded-btn`, `shadow-card`, `font-display`, `animate-slide-up`, …)
- **Typography**: `font-display` (Bricolage Grotesque) for headings, `font-sans`
  (Hanken Grotesk) for body, `font-mono` (Space Mono) for figures where it helps
- **Primitives**: reuse `src/components/ui/` (`primitives.tsx` incl. `Toggle`/`ToggleTrack`, `Sheet.tsx` (a labelled `role="dialog"`; optional pinned `footer` for actions), `Icon.tsx`)
  before creating new components; put new shared pieces there

### Using Claude Design
Involve **Claude Design** whenever the work is design-led rather than a small tweak:
- New screens, flows or features with UI
- Significant redesigns of existing screens, navigation or layout
- New visual language: components, iconography, illustrations, empty states,
  onboarding, marketing/landing pages
- Any time the right look or interaction is unclear and options should be compared

Workflow: explore and agree the design in Claude Design (mockups/prototypes, mobile
first, then tablet/desktop) → confirm the direction with the user → implement it with
the project's tokens and primitives → check the build against the design at 375px,
768px and 1024px+. Small fixes that stay inside the existing design system don't need
a Claude Design pass.

### UI Change Checklist
- [ ] Uses tokens/primitives only; no hard-coded colors, radii or shadows
- [ ] Looks right at mobile (375px), tablet (768px) and desktop (1024px+)
- [ ] Loading, empty, error and success states covered
- [ ] Contrast, focus, labels and keyboard access checked
- [ ] Motion is subtle and honours reduced-motion
- [ ] `npm run lint` and `npm run build` pass

## What to Avoid
- Don't add a test framework — no tests exist and none are expected
- Don't introduce CSS Modules or styled-components
- Don't write prices anywhere but `price_reports` (append-only; only the importer moves
  its own `import` reports' `observed_at`) — `current_prices` is written only by its trigger
- Don't make the importer ignore robots.txt, hide its user agent, or work around a store's
  block (403/429/captcha/token gates) — record the store as not imported in
  `docs/data-sources.md` instead
- Don't add dark mode — `ThemeContext` is light-only by design
- Don't add Redux/Zustand — the context pattern is intentional
- Don't create SpendLess tables/functions in `public` or touch other apps' objects —
  everything goes in the `spendless` schema (shared Supabase project)
- Don't make Lists depend on the network — all list reads/writes go through
  `ListsContext` (IndexedDB first, then sync)
- Don't ship UI with hard-coded colors/sizes, unstyled default controls, or missing
  loading/empty/error states
- Don't commit secrets, ship a `service_role` key to the client, or weaken RLS/storage
  policies — see **Security**
