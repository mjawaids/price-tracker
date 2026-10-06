# Data sources: the daily store price import

Where SpendLess's shared prices come from, what we checked before reading each
store, and how the importer behaves. Code: `scripts/import/`. Schedule:
`.github/workflows/price-import.yml`. Data model: `docs/compare-data.md`.

## Rules for every source

- **Only public pages, read politely.** robots.txt is read on every run and obeyed
  (the `SpendLessBot` group, else `*`; longest match wins; Crawl-delay honoured).
  Paths and rules are compared after RFC 9309 percent-encoding normalisation, so
  `/%61pi/` counts as `/api/`.
  One request at a time per site, at least 1 second apart.
- **Redirects are checked before they're followed.** The importer follows them by
  hand, one hop at a time (at most 5): a redirect to another site, or to a path
  robots.txt disallows, is never requested. Only robots.txt itself may redirect
  elsewhere, as RFC 9309 allows.
- **Honest identity.** User agent `SpendLessBot/1.0 (+https://spendless.ibexoft.com/bot)`.
  `/bot` explains the bot and how to opt out.
- **Never get around a block.** A 401/403/429/503 or a challenge page stops that store
  for the day (`import_runs.status = 'blocked'`). There are no other user agents,
  proxies or retries past a refusal, and nothing behind a login.
- **Facts only.** We store name, brand, size, price, availability, the store's aisle
  name and the product URL. We don't copy images, descriptions or reviews.
- **Grocery and household only.** Food, drinks, household, personal care and baby
  aisles are imported (baby formula included). Pharmacy, medicines, supplements,
  make-up, perfume, fashion, electronics, toys, stationery, crockery and similar aisles
  are left out (`scripts/import/aisles.ts`). A product whose name reads as a pharmacy
  item in our taxonomy (pain relief, ORS, vitamins, bandages, cough syrup, antiseptic,
  hand sanitiser, medical face masks, adult diapers) is left out in whatever aisle the
  store files it, e.g. Panadol under "Personal Care". A beauty face mask isn't a
  medical one, and a cosmetic that mentions a vitamin isn't a vitamin, but only on a
  clearly topical signal: a topical form in its name ("Vitamin C Serum", soap, lotion,
  face mist), or, when nothing in the name says it's swallowed (oral, tablets,
  softgels, gummies…), a beauty word ("Glow") or a skin, face or hair aisle. So
  "Vitamin D3 Oral Spray" stays out in any aisle, and so does a plain "Vitamin D3 Spray"
  under "Health & Beauty". An aisle that mixes kept and left-out goods is decided per
  product by its name: "Deos & Perfumes" keeps deodorants and leaves out perfumes;
  "Home & Car Fresheners" keeps home fresheners and leaves out car ones. When these
  rules change to include more, `RULES_CHANGED_AT` makes the importer re-read the
  listings it left out that the new rules would now include.
- **Opt-out.** A store that asks us to stop is removed from `scripts/import/sources.ts`,
  and its imported prices are retired.
- Not legal advice: Pakistan's PECA 2016 covers unauthorised access. Respecting
  robots.txt and never passing a block keeps the importer to what any visitor can see.

## Stores imported (Karachi)

All checks below were made on **2026-10-05**.

| Store | Website | robots.txt | Terms | How prices are read | Delivery rule (source) |
|---|---|---|---|---|---|
| Diamond Super Market | dsmonline.pk | Products and `/graphql` allowed (search and filter URLs disallowed) | No terms page found (its CMS has no `terms-and-conditions` page) | Public Magento GraphQL `products` by category, 100 a page. Prices are the same at every branch (only stock differs); Clifton's are used | Rs 150 flat. Site FAQ: "We deliver across Karachi in Rs. 150/- only per order" |
| Hydri Super Market (**paused**, see below) | hydrisupermarket.com.pk | `Allow: /` | Terms page returns 404 | Category pages (hidden inputs per product card: title, price, brand, category). Later pages through the site's own `/search/page_filter` form, 24 a page. "Sold out" = no add-to-cart button | Rs 200, free over Rs 2,000. `/shipping-delivery`: "Delivery Charges: Rs. 200 per order · Free Shipping above 2000+" |
| Imtiaz | shop.imtiaz.com.pk | None (404), so nothing disallowed | No terms text linked | The shop's own menu JSON for Karachi branch 54934, the same one its web app loads (1 request, about 1,300 items) | Rs 199, free at Rs 3,000 or more, min order Rs 500. Fee and minimum from the site's Karachi delivery areas; free-delivery threshold confirmed by the owner |
| Chase Up | chaseupgrocery.com | `/product/…` allowed; **`/api/*` disallowed** | Terms page has no clause on scraping, crawling, robots, automation or copying | Each product page's server-rendered `__NEXT_DATA__`, found via the sitemap. **Rolling refresh**: up to 3,000 pages a run, new and longest-unchecked first. Price for branch 56247 (North Nazimabad) | Rs 150, min order Rs 1,000. Site's Karachi delivery areas (branches 56119 Gulistan-e-Johar, 56246 Clifton, 56247 North Nazimabad) |
| Spar | store.spar.pk | Same platform and rules as Chase Up | No terms text linked | As Chase Up, up to 3,000 pages a run; branch 54346 (Sharfabad), which delivers in Karachi | Rs 150. Site's delivery areas: Rs 150 in 61 of 112 areas, Rs 290 or Rs 500 farther out; no minimum |
| Bin Hashim | binhashimonline.pk | Same platform and rules as Chase Up | No terms text linked | As Chase Up, up to 5,000 pages a run. One branch (55203), so the item price is the one shown. About 56,000 products including a large pharmacy section, so the first full pass takes about 11 days; left-out pages are looked at again every 60 days (a tenth of each run is kept for that) | Rs 299, no minimum. Site's delivery areas |

**Blink-platform prices (Chase Up, Spar, Bin Hashim)** follow the site's own
code: the chosen branch's price entry if there is one, else the item price; the
discounted price when there is one; available when the item and the branch are both
on. Items priced by variant ("from Rs …") are recorded as left out rather than
guessed. Branch ids came from one ordinary visit to each home page in a browser;
the daily job never calls `/api/*`.

**Note for Chase Up:** its public page configuration includes fields that look
like payment-gateway keys (e.g. `xpay_api_secret`). We never store page
configuration. Worth mentioning to them if we're in touch.

## Paused

**Hydri Super Market** is paused (`paused` in `scripts/import/sources.ts`, so `--source all`
skips it).
- It allowed the importer from a test machine during development.
- On the first run from GitHub's servers (2026-10-05), robots.txt answered 200 and the home
  page then answered **403**. The importer stopped for the day, as it should, and we
  don't work around a refusal.
- **To resume:** if Hydri allows SpendLessBot (e.g. after we contact them), dry-run it from
  GitHub (*Actions → Price import*, source `hydri`). If that works, remove `paused`.

## Stores not imported, and why

| Store | Why not | What would change it |
|---|---|---|
| Naheed (naheed.pk) | Its robots.txt returns **403** to our user agent (a plain request gets 200). That's a refusal | Naheed allowing SpendLessBot, or a feed |
| Metro (metro-online.pk) | Product data needs a guest token that the page's JavaScript issues (encrypted `/api/post`); without it the API returns 401. Getting one ourselves would mean working around an access control. Its terms also forbid duplicating its "texts" and call prices "guide prices only" | A feed or partnership |
| Springs (springs.com.pk) | robots.txt has a group titled "Scrapers and AI trainers — blocked outright" | A feed or partnership |
| foodpanda shops (PandaMart, Springs, Spar, Bin Hashim, Meri Pharmacy, Rehmat-e-Shireen) | PerimeterX bot protection answers 403. Spar and Bin Hashim are covered by their own websites | A feed or partnership |
| KraveMart (inDrive.Groceries) and other app-only stores | No website catalogue; reverse-engineering the app breaks its licence | Receipts and manual prices (Phases 3–4), or a feed |

## How a run works

`node --experimental-strip-types scripts/import/run.ts [--source <id>|all] [--dry-run] [--max-pages N]`

1. **Keys no listing gives** (`keys.ts`, `backfill-*.sql`): public products with no
   `match_key` yet, and the ones sold at a public store we don't import (the promoted
   Panda Mart rows), have their variant, size, pack and key read again from the name
   with the current parser. Their keys then match imported listings read the same way.
   Brand and item type stay as stored, and nothing is written unless it changed.
2. Each store runs side by side (different sites), and each is independent:
   - read robots.txt;
   - the adapter (`scripts/import/adapters/`) reads listings;
   - `normalize.ts` parses each name (`src/lib/compare/productName.ts`) and decides the aisle;
   - `write.sql` writes it in **one transaction**.
3. **Matching a listing to a catalogue product**, checked every time it's read, in order:
   - the product this listing mapped to before, while it still fits: the same
     `match_key`, and a price in line with the other stores' (within ⅓× to 3× of
     their median price for it);
   - else a public product with the same `match_key`, if the price is in line. When
     two products have come to share a key, listings move to the older one;
   - else, when the old product was this listing's alone, it stays and takes the new
     key, name, size and pack;
   - else a new public product. One priced unlike the others with its key (a carton
     of 12 listed as "1 Ltr") is held apart, with no key.
   - A listing that moves to another product leaves one "out of stock" report on the
     old one. A product every listing has left, with nothing in stock, loses its key.
   - `match_key` = brand | item type | variant words | size | pack | the name's other
     numbers (so "BF1" and "BF2", or "Nido 3+", stay apart).
   - Variant words keep what tells products of one type apart: "Shami" and "Chapli"
     kabab masala, "Nihari" masala, "Canola" oil. Words that only name the item
     ("Tomato" ketchup, Soap "Bar", "Shower Gel") don't count.
   - Sizes: "50g+50g" is a pack of two, "195g+100g" is 295 g, and parts in different
     units ("20ml+20g" hair colour) give no key.
   - It's only set when brand, type and size were all read with confidence.
   - A key shared by two listings of one store is not trusted.
4. **Prices** are `price_reports` with `user_id NULL` and `source 'import'`.
   - An unchanged price moves its latest import report's `observed_at` forward
     instead of adding a row.
   - A change adds one report.
   - A listing that disappears (page gone, or missing from a complete read) gets one
     "out of stock" report, and so does one that is now left out.
5. **Each store's run** is recorded in `import_runs`: counts and a short status code,
   never page content. `store_listings` remembers each listing (store id, our product,
   last price, when checked), which drives the rolling refresh.

A dry run fetches and parses but never touches the database, and prints counts plus a
short sample. The GitHub Actions log is public: it shows counts and a few store
listings, never the database URL.

## Adding a store

1. Check robots.txt (for `SpendLessBot` and `*`) and the terms. Record both here with the date.
2. Find the store's delivery fee and minimum order on its own pages. If you can't, ask; don't guess.
3. Add an entry to `scripts/import/sources.ts`:
   - a new fixed UUID for the store;
   - region, website and delivery rule;
   - the adapter and its options;
   - a request cap.
   - Reuse an adapter if the platform matches.
4. Dry-run it with a small cap: `node --experimental-strip-types scripts/import/run.ts --dry-run --source <id> --max-pages 20`.
   Check type, size and match-key coverage and the sample.
5. Merge, then run *Actions → Price import* by hand: first with *dry run*, then for real.
