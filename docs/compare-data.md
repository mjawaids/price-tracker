# Compare data: catalogue, prices and plans

How SpendLess knows what things cost, where, and how it turns a list into a
"where to buy" plan. Schema: `supabase/migrations/20261005000000_compare_catalog.sql`
(+ `20261005000100_compare_copy_personal_data.sql`, `20261005120000_compare_import.sql`).
Logic: `src/lib/compare/`. Store imports: `docs/data-sources.md`.

## The idea in one paragraph

A list item ("bread") is matched to products ("Dawn Milky Bread 800g"), products
have prices at stores, and the optimizer picks the cheapest way to buy the whole
list — delivery fees and minimum orders included. Prices come from store imports,
from people's own entries, and from receipts. Shared prices are live in
**Karachi** first; everywhere else Compare runs on the user's own stores and prices.

## Tables (`spendless` schema)

| Table | What it holds | Who can write |
|---|---|---|
| `regions` | Cities. `status`: `live` (shared prices on) or `gathering` (personal mode) | Migrations only |
| `catalog_stores` | Stores. `owner_id NULL` = public; otherwise private to that user. Public stores belong to a region. `kind` `online` or `physical`; a public `physical` store is a shared in-store shop (`<chain> · <area>`, no delivery): a chain's **branch** from `scripts/seed/branches/` (same `chain` as the chain's online store), or a shop people shared (`branch_suggestions`; any shop, independent ones too). `delivery_rule` jsonb (+ optional `minOrder`) | Users: their own private rows. Public rows: scripts only |
| `catalog_products` | Products with structured `brand`, `item_type`, `variant`, size (`size_value` + `size_unit` of one unit, `pack_count`); `match_key` (set by the importer: the same product at two stores → one row; `''` = not confident, or held apart because its price is unlike the others with that key; see `docs/data-sources.md`) | Same as stores |
| `price_reports` | **Append-only** observations: price (one pack), `observed_at`, `source`, `status`. `user_id NULL` = system source | Users add their own (user sources only); read and delete only their own; nobody updates |
| `current_prices` | The price shown per (store, product), derived from reports; `n_reports = 0` = no price any more (tombstone); `disputed` = people say it's wrong (see below) | Only the trigger |
| `user_stores` | "My stores" (empty = the default set: the city's public online stores + your private ones; shared in-store shops count only once picked, or once your own shop moved into one) | Owner |
| `branch_suggestions` | A user's own in-store shop suggested as a shared one: `store_id` (theirs; NULL once deleted), `region_id`, `chain` + `area` (the shared name, plain text only), `chain_key` / `area_key` (`spendless.place_key`, set by the insert trigger), `status` `open` → `promoted` (`promoted_store_id`) or `declined`, `decided_at` | Owner adds (their own open in-store shop in a live city; at most 10 waiting) and withdraws while `open`; nobody updates; the decision is the nightly job's |
| `item_preferences` | A user's "usual" per list item name: `mode` (`exact` / `brand_size` / `any_size`), `product_ids`, `ref_product_id` | Owner |
| `plans` | Plans applied to a list (totals, savings) — powers "saved this month" | Owner |
| `store_listings` | The importer's memory: each store's own product id → our product, last price, when checked, `included` (false = an aisle we leave out) | Importer only; clients can't read it |
| `import_runs` | One row per store per import run: counts and a short status code | Importer only; clients can't read it |
| `reporter_trust` | How much each person's prices count: `weight` 0.5–1.2 (no row = 1), `compared`, `agreed` (see "Reporter trust") | The nightly job only; clients can't read it |
| `list_items` (+cols) | `plan_store_id`, `plan_product_id`, `plan_price`; `product_id` = product pinned on the item | Owner (synced offline like the rest of the list) |

Everything a user creates is **private** unless it's explicitly promoted to public —
by an admin job with the owner's consent, or by the user suggesting their shop as a
shared one (see "Shared shops" below).
The existing per-user `products` / `stores` rows were copied into `catalog_*` as
private rows with the **same ids** (their prices became `manual` reports).

## How a price is decided

`current_prices` is rebuilt by `spendless.refresh_current_prices()` (a SECURITY
DEFINER trigger function — it has to read everyone's reports — with a pinned
`search_path` and EXECUTE revoked from client roles) once per statement that
inserts, updates or deletes reports:

- **Weighted median** of accepted, non-dispute reports from the last **30 days**;
  if there are none, the latest report stands (the app labels it as old).
- Weight = source × recency × reporter trust. Source: `feed`/`receipt` 1.0, `import`
  0.9, `trip`/`confirm` 0.8, `manual` 0.6. Recency halves every 10 days. Trust is the
  person's `reporter_trust.weight` (1 without a row, and for system sources).
- The newest report decides availability (out of stock).
- `confidence` = the summed weight (capped at 1); `n_reports` = reports counted.
- A pair whose last counted report is retracted (or rejected) isn't deleted: it
  becomes a **tombstone** (`n_reports = 0`, no price, `updated_at` bumped), because
  apps sync this table by `updated_at` and can't see a row that's gone. A new
  report revives it. Readers treat `n_reports = 0` as "no current price".
- **Held prices that others agree with count.** First (at trigger depth 1 only, so its
  own update just recomputes), a `pending` report at a changed pair becomes `accepted`
  when someone else — another person, or the store's import (`user_id NULL`) — has an
  accepted or pending, non-dispute report there within **10%** of it, observed within
  **14 days** of it. Two held reports that agree accept each other. The check runs from
  the few pending reports (`price_reports_pending_idx`), so a bulk import stays fast.
  This is the only way a report's status changes.
- **Disputed**: `disputed` is true when at least **2 different people** sent a
  `dispute` report for the pair after its newest counted report (within the last 30
  days). Any newer counted report clears it (for imported prices, the next daily
  import, which moves its report's `observed_at` forward); a tombstone resets it.

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
  price is stored as `pending` and not counted until someone else agrees (see "How a
  price is decided"). The insert returns `pending` before the statement's trigger may
  accept it, so the app reads the status again by id (`api.settledStatus`).
- **Disputes** (`source 'dispute'`, "Wrong price?" in the app) carry the price the
  person was shown, skip the outlier check and never count as a price; they only mark
  a price as disputed (above). A dispute within 10 minutes of the person's own report
  for the pair replaces it, like any correction (the app hides "Wrong price?" on the
  user's own prices).

### Reporter trust

`scripts/seed/reporter-trust.ts` + `reporter-trust.sql` run nightly
(`.github/workflows/reporter-trust.yml`, 02:53 Karachi; a manual run rolls back unless
*apply* is ticked; the log shows counts only). For each person, their prices at public
stores from the last **90 days** (user sources; accepted, or held and unconfirmed for
14+ days) are compared with **other** people's accepted prices for the same store and
product within ±14 days (imports included). A price **agrees** when at least half of
those are within 15% of it — a vote, so one person's wrong prices can't drag the
reference. With fewer than **5** comparable prices the weight stays 1; otherwise
`s = (agreed + 3) / (compared + 4)` and `weight = clamp(0.5, 1.2, 1 + 2 × (s − 0.75))`.
People with nothing left to compare go back to 1 (row deleted). A new weight applies
the next time a pair's price is worked out (any new report there); the job never
touches reports. Weights are never shown, and no client can read the table.

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
- "Stores considered" (`consideredStores`: what Where to buy compares, and the "your
  stores" prices on Prices, Search and product pages) = the user's picks
  (`user_stores`), else the **default set** (`defaultStoreIds`): every active store
  except shared in-store branches, i.e. the city's online stores plus the user's own.
  A branch counts once the user adds it to My stores (Compare → Stores → *Choose*, or
  *Add to My stores* on the branch) — a plan shouldn't send anyone across the city.
  A shared shop the user's own shop moved into is in the default set too (it replaced
  their own copy), so a user without picks keeps it in plans.
  Picks that equal the default set are saved as none, so new online stores still join.
  Branch prices still show everywhere else: a product page's "Other stores", the
  Add a price and receipt store pickers.
- Prices are fetched for every store in the snapshot, branches included, a few dozen
  store ids per request so the URL stays short (`fetchPrices`, `STORE_CHUNK`).
- **Disputed and held prices.** Where to buy (`resolve.ts`) and the lists of cheapest
  prices (`usePriced`: Prices, Search, product rows) leave a `disputed` shared price
  out; the user's own newer price at that store still counts. A product page still
  lists it under its store, last, with "Some people say this is wrong" and never as
  the best. On a shared store's price (not the user's own, not their own shop) a
  product page offers **Wrong price?** (`WrongPriceSheet`): the right price (a normal
  `manual` report, which may be held), "They don't sell it any more" (out of stock),
  or "It's wrong, I don't know the price" (a `dispute` report with the shown price).
  The user's own held report shows as theirs with "Only you for now".
- *Use this plan* writes `plan_store_id` / `plan_product_id` / `plan_price` on each
  open item (through the offline Lists outbox) and inserts a `plans` row.
- The old Compare cart (`shopping_lists`) is turned into a list called "From Compare
  cart" once per user (flag `spendless-cart-migrated:<userId>` in localStorage), after
  the user's lists have synced and only if no list with that name exists.
- Analytics events carry counts only (`plan_applied`, `price_reported`,
  `cart_converted`, `receipt_read`, `receipt_failed` (with a reason like `nothing` or
  `pdf` and, for a PDF, a problem like `password`), `receipt_saved`, `receipt_undone`,
  `receipt_shared` (files, kind, read or dismissed), `branch_suggested` (whether the
  chain was picked or typed), `branch_suggestion_withdrawn`, `shared_shop_seen`
  (count)) — never names, prices, ids or receipt text.

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
3. **In-store branches** — the branches each chain publishes on its own website
   (Karachi: Imtiaz 14, Spar 6, Diamond Super Market 6; sources and what was left out
   in `docs/data-sources.md`). The reviewed list is `scripts/seed/branches/<city>.json`
   (fixed ids, so a re-run updates in place); `scripts/seed/add-branches.ts` validates
   it (UUIDs, lengths, unique ids and names, each `chain` must be a public online
   store's chain in that city) and writes it in one transaction, inserting or updating
   public `physical` stores only — never a private or online store, never a delete
   (closing one is `"status": "closed"`). Run it from *Actions → Catalog jobs*, job
   `add-branches`: first as a dry run (it lists new, changed, unchanged, and public
   branches in the city that aren't in the file), then with *apply* ticked. A branch
   has no prices until people add them (receipts match a branch by chain and area).
4. **People's prices** — while shopping, and from receipts (pictures, PDFs or text,
   read on the device; the file is never uploaded, and one shared to SpendLess from
   another app waits on the device only until it's read or dismissed). A receipt is saved by one call to
   `spendless.save_receipt` (SECURITY INVOKER: RLS and the report trigger apply as for
   any insert), which runs as one transaction: it makes a private product for each
   medicine that needs one — reusing the user's own active product with the same name,
   spaces and case ignored — then inserts the `source 'receipt'` reports, one per
   product, with `observed_at` = local noon of the receipt date (or now for today).
   All or nothing: the daily limit or a refused row saves no prices and leaves no new
   products behind. Medicines are the user's own private products, so their prices
   are visible to them only. What the user chose for a receipt line is remembered on
   the device only.
5. **Shared shops** — a user can suggest one of their own in-store shops as a shared
   one (the shop's sheet → *Share this shop*, or the receipt's "just for you" banner),
   naming the shop or chain and its area (`src/lib/compare/areas.ts`: the city's areas
   and the other ways people write them; names compare by `spendless.place_key`, whole
   keys only, so "DHA Phase VIII" = "dha ph 8" but Nazimabad ≠ North Nazimabad). Every
   night `scripts/seed/promote-suggestions.ts` (*Actions → Shared shops*) groups waiting
   suggestions by city + chain key + area key:
   - a shared in-store shop with the same keys exists → the suggestions **move into**
     it (no minimum: it's already shared);
   - a *closed* shared shop has those keys → they're **declined** (it was removed);
   - else, once enough different people (`SHARED_BRANCHES_MIN_PEOPLE`) count, a new
     shared shop `<chain> · <area>` is made (fixed id from its keys; at most 5 a run).
     A person counts when their account is at least 7 days old (email confirmed, not
     anonymous, banned or deleted — `auth.users` is shared with other apps), their shop
     was added at least 7 days ago, and they have accepted prices for at least 3
     products there in the last 60 days.
   A suggestion moves only after a day (time to withdraw it). Moving copies the
   person's latest accepted price per product there (last 60 days) to the shared shop as
   **new** `price_reports` rows — keeping their `user_id`, so they can still retract
   them, never shown with a name — with `created_at` at least 25 hours back (copies
   never count toward the daily limit) and fixed ids (re-runs add nothing). A copy more
   than 40% from the shop's current price, or from the middle of what two or more
   people paid, is held as `pending`. Their own products' prices stay visible to them
   only. Then the shared shop replaces the private one in My stores (only where it was
   picked) and on planned list items, the private copy is closed (kept, with its
   history), and the suggestion is `promoted`. The app shows "Your shop is now shared"
   once (Prices and Stores; seen ids in `spendless-shared-shop:<userId>`). Every run
   also re-points planned list items an offline device wrote back to a moved shop, and
   removes waiting suggestions whose shop was deleted or changed to online. Undo:
   *Catalog jobs* → `close-branch` (`docs/deployment.md`).

## Roadmap

- More import sources as feeds or partnerships allow (see `docs/data-sources.md`).
- Trip capture (confirm the price when you tick an item), freshness badges, "your
  contributions". (Held prices that others agree with, disputes and reporter trust are
  live.)
- Receipt import: screenshots, photos, PDFs, pasted text and "Share to SpendLess" are
  live (Compare → Contribute → Add a receipt, read on the device), with public in-store
  branches (Karachi) and shops people share; next till-receipt tuning on full-size
  photos.
- More cities: readiness meter, promoting corroborated private stores, merging
  duplicate products, a small moderation queue.
