# Compare data: catalogue, prices and plans

How SpendLess knows what things cost, where, and how it turns a list into a
"where to buy" plan. Schema: `supabase/migrations/20261005000000_compare_catalog.sql`
(+ `20261005000100_compare_copy_personal_data.sql`, `20261005120000_compare_import.sql`).
Logic: `src/lib/compare/`. Store imports: `docs/data-sources.md`.

## The idea in one paragraph

A list item ("bread") is matched to products ("Dawn Milky Bread 800g"), products
have prices at stores, and the optimizer picks the cheapest way to buy the whole
list — delivery fees and minimum orders included. Prices come from store imports,
from people's own entries, and (later) from receipts. Shared prices are live in
**Karachi** first; everywhere else Compare runs on the user's own stores and prices.

## Tables (`spendless` schema)

| Table | What it holds | Who can write |
|---|---|---|
| `regions` | Cities. `status`: `live` (shared prices on) or `gathering` (personal mode) | Migrations only |
| `catalog_stores` | Stores. `owner_id NULL` = public; otherwise private to that user. Public stores belong to a region. `delivery_rule` jsonb (+ optional `minOrder`) | Users: their own private rows. Public rows: scripts only |
| `catalog_products` | Products with structured `brand`, `item_type`, `variant`, size (`size_value` + `size_unit` of one unit, `pack_count`); `match_key` (set by the importer: the same product at two stores → one row; `''` = not confident, or held apart because its price is unlike the others with that key; see `docs/data-sources.md`) | Same as stores |
| `price_reports` | **Append-only** observations: price (one pack), `observed_at`, `source`, `status`. `user_id NULL` = system source | Users add their own (user sources only); read and delete only their own; nobody updates |
| `current_prices` | The price shown per (store, product), derived from reports; `n_reports = 0` = no price any more (tombstone) | Only the trigger |
| `user_stores` | "My stores" (empty = all public stores in the city + your private ones) | Owner |
| `item_preferences` | A user's "usual" per list item name: `mode` (`exact` / `brand_size` / `any_size`), `product_ids`, `ref_product_id` | Owner |
| `plans` | Plans applied to a list (totals, savings) — powers "saved this month" | Owner |
| `store_listings` | The importer's memory: each store's own product id → our product, last price, when checked, `included` (false = an aisle we leave out) | Importer only; clients can't read it |
| `import_runs` | One row per store per import run: counts and a short status code | Importer only; clients can't read it |
| `list_items` (+cols) | `plan_store_id`, `plan_product_id`, `plan_price`; `product_id` = product pinned on the item | Owner (synced offline like the rest of the list) |

Everything a user creates is **private** unless it's explicitly promoted to public.
The existing per-user `products` / `stores` rows were copied into `catalog_*` as
private rows with the **same ids** (their prices became `manual` reports).

## How a price is decided

`current_prices` is rebuilt by `spendless.refresh_current_prices()` (a SECURITY
DEFINER trigger function — it has to read everyone's reports — with a pinned
`search_path` and EXECUTE revoked from client roles) once per statement that
inserts, updates or deletes reports:

- **Weighted median** of accepted, non-dispute reports from the last **30 days**;
  if there are none, the latest report stands (the app labels it as old).
- Weight = source × recency. Source: `feed`/`receipt` 1.0, `import` 0.9,
  `trip`/`confirm` 0.8, `manual` 0.6. Recency halves every 10 days.
- The newest report decides availability (out of stock).
- `confidence` = the summed weight (capped at 1); `n_reports` = reports counted.
- A pair whose last counted report is retracted (or rejected) isn't deleted: it
  becomes a **tombstone** (`n_reports = 0`, no price, `updated_at` bumped), because
  apps sync this table by `updated_at` and can't see a row that's gone. A new
  report revives it. Readers treat `n_reports = 0` as "no current price".

The app overlays the user's **own** latest report (last 30 days, `pending` ones
included) when it's at least as new as the shared price, so what you entered is what
you see, even before anyone else agrees.

## Quality and anti-spam (server-side)

Enforced in RLS and in `spendless.price_reports_before_insert()`:

- Users can't edit or delete public stores/products, and can't write anyone else's rows.
- Reports: only for stores/products the user can see, only user sources
  (`manual`, `trip`, `confirm`, `dispute`, `receipt` — never `import`/`feed`),
  `observed_at` within the last 90 days and not in the future, price 0 < p < 10M.
- **Rate limit**: 500 reports per user per day.
- **Corrections**: a new report for the same store and product within 10 minutes
  replaces the previous one.
- **Outliers**: at a public store, a report more than 40% away from the current
  price is stored as `pending` and not counted. (Corroboration and reporter trust
  come later — see the roadmap.)

## Matching a list item to products (`src/lib/compare/`)

| File | Job |
|---|---|
| `itemTypes.ts` | Curated item types ("milk", "masoor-daal") with English + romanized-Urdu keywords, a price display unit, an optional parent type, and whether brand swaps are suggested by default (off for personal care, baby, pharmacy); `modifierWords()` keeps the words that tell products of a type apart ("shami" in "shami kabab") |
| `productName.ts` | Name → brand, item type, variant, size, pack ("Olper's Milk Full Cream 1Ltr x 12" → Olper's · milk · Full Cream · 12 × 1000 ml; "Shan Shami Kabab Masala 50g+50g" → Shan · kebab · Shami Masala · 2 × 50 g); `learnBrands()` for imports |
| `units.ts` | Size labels, unit prices (per 100 g / kg / L / piece / dozen), "similar size" (±15%), packs needed for "atta 10 kg" |
| `resolve.ts` | List item → acceptable products + priced options. Order: pinned product → the user's usual → brand/words named in the text → item type with an *assumed* default (last bought, else the product most of your stores carry) → not compared |
| `optimizer.ts` | Tries every set of 1–4 stores (best 12 candidates), assigns each item to its cheapest store in the set, then moves items while it lowers the total (crossing "free over X", meeting minimum orders). Returns *cheapest*, *fewer stops* (2+ stores, fewer than cheapest), *one stop*, *delivered* (online stores only; hidden when it's the same stores as another choice), and a "buy it all at X" baseline for savings (the best single store other than the cheapest plan's only store) |
| `describe.ts` | Wording for the app: how an item was matched, how old a price is, delivery rules and notes |

## In the app

- `src/contexts/CompareContext.tsx` holds the catalogue for the user's city: public
  stores in the region plus the user's own, the products priced there plus the user's
  own, current prices, the user's reports from the last 30 days, usuals, "my stores"
  and this month's plans. Reads and writes go through `src/lib/compare/api.ts`.
- The snapshot is cached per user in IndexedDB (`spendless-catalog-<userId>`,
  `src/lib/compare/cache.ts`) so Where to buy works offline. Prices are pulled by
  `updated_at` since the last sync (tombstones remove a price); a full refresh runs
  when the city changes, after 24 hours, or when new stores appear. A refresh asked
  for while one is running is queued, not dropped, and a run whose city or user
  changed meanwhile is thrown away. Sign-out deletes the cache.
- "Stores considered" = the user's picks (`user_stores`), else every active store in
  the snapshot.
- *Use this plan* writes `plan_store_id` / `plan_product_id` / `plan_price` on each
  open item (through the offline Lists outbox) and inserts a `plans` row.
- The old Compare cart (`shopping_lists`) is turned into a list called "From Compare
  cart" once per user (flag `spendless-cart-migrated:<userId>` in localStorage), after
  the user's lists have synced and only if no list with that name exists.
- Analytics events carry counts only (`plan_applied`, `price_reported`,
  `cart_converted`) — never names, prices or ids.

## Regions

Seeded: Karachi (`live`), and Lahore, Islamabad, Rawalpindi, Faisalabad, Multan,
Hyderabad, Peshawar, Quetta (`gathering`). A city goes live by changing its
`status` in a migration once it has enough public stores and fresh prices.

## Where public data comes from

1. **The existing Panda Mart import** — promoted to public (Karachi) with its
   owner's consent by `scripts/seed/promote-store.ts` (manual GitHub Actions run).
2. **Daily online-store import** — Diamond, Imtiaz, Chase Up, Spar and Bin Hashim
   (Karachi; Hydri is paused), read politely once a day by `scripts/import/run.ts`
   (`.github/workflows/price-import.yml`). Each source, what we checked, and the
   stores we don't import are in `docs/data-sources.md`. Imports are `price_reports`
   with `user_id NULL` and `source 'import'`. While a price stays the same, the
   importer moves its latest import report's `observed_at` forward instead of adding
   a row every day, so "updated today" stays true and the table stays small. A listing
   that disappears gets one "out of stock" report.
3. **People's prices** — while shopping, and from receipts (image or text, read on
   the device; the file never leaves it). A receipt is saved as one insert of
   `source 'receipt'` reports (all or nothing: the daily limit or a refused row saves
   none), one per product, with `observed_at` = local noon of the receipt date (or now
   for today). Medicines become the user's own private products, so their prices are
   visible to them only. What the user chose for a receipt line is remembered on the
   device only.

## Roadmap

- More import sources as feeds or partnerships allow (see `docs/data-sources.md`).
- Trip capture (confirm the price when you tick an item), disputes, corroboration of
  pending reports, reporter trust, freshness badges, "your contributions".
- Receipt import: screenshots, photos and pasted text first (on-device OCR, built;
  the screen is next), then PDFs and "share to SpendLess", then public in-store branches
  and suggested branches.
- More cities: readiness meter, promoting corroborated private stores, merging
  duplicate products, a small moderation queue.
