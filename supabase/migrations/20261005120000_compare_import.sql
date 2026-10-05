/*
  # Compare: daily store price import (Phase 2)

  The importer (scripts/import/, run daily by .github/workflows/price-import.yml)
  reads public product listings from online stores in live cities and writes them
  as system `import` price reports. See docs/data-sources.md for each source.

  1. New tables (system data, written only by the importer)
    - `store_listings` — one row per product as a store lists it: the store's own id
      for it, the catalogue product it maps to, its last price and when we last
      checked it. Listings outside the aisles we compare (e.g. pharmacy) are kept
      with `included = false` and no product, so they aren't re-read every day.
    - `import_runs` — one row per source per run: counts and a short status, for
      monitoring. No product data, no personal data.

  2. `catalog_products.match_key`
    - A normalised `brand|item type|variant|size|pack` key computed by the importer
      (src/lib/compare/productName.ts). The same product listed by two stores maps
      to one catalogue row, so "exactly this one" compares across stores. '' means
      "computed, but not confident enough to match on".

  3. Security
    - RLS is enabled on both new tables with NO policies: anon and authenticated
      users can't read or write them at all. Only the importer's direct database
      connection (the table owner) uses them. Granted to service_role only.
    - Imported prices still go through `price_reports` (user_id NULL, source
      'import') and the existing `refresh_current_prices` trigger.

  4. Notes
    - Idempotent: safe to run more than once.
    - While a store's price is unchanged, the importer moves its latest import
      report's `observed_at` forward instead of adding a new report every day, so
      the table stays small and the app's "updated today" stays true.
*/

CREATE SCHEMA IF NOT EXISTS spendless;

-- ── Match key on products ────────────────────────────────────────────────────
ALTER TABLE spendless.catalog_products
  ADD COLUMN IF NOT EXISTS match_key text CHECK (match_key IS NULL OR char_length(match_key) <= 200);

CREATE INDEX IF NOT EXISTS catalog_products_public_match_idx
  ON spendless.catalog_products(match_key)
  WHERE owner_id IS NULL AND match_key IS NOT NULL AND match_key <> '';

-- ── Store listings ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spendless.store_listings (
  store_id uuid NOT NULL REFERENCES spendless.catalog_stores(id) ON DELETE CASCADE,
  -- The store's own id for the product (SKU, item id, …).
  external_id text NOT NULL CHECK (char_length(external_id) BETWEEN 1 AND 120),
  -- NULL while the listing is outside the aisles we import.
  product_id uuid REFERENCES spendless.catalog_products(id) ON DELETE SET NULL,
  url text CHECK (url IS NULL OR (url ~* '^https://[^[:space:]]+$' AND char_length(url) <= 500)),
  source_name text NOT NULL CHECK (char_length(source_name) BETWEEN 1 AND 200),
  source_category text CHECK (source_category IS NULL OR char_length(source_category) <= 160),
  included boolean NOT NULL DEFAULT true,
  last_price numeric(12, 2) CHECK (last_price IS NULL OR last_price > 0),
  last_available boolean NOT NULL DEFAULT true,
  -- false once the store stops listing it (page gone, or missing from a full listing).
  active boolean NOT NULL DEFAULT true,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_checked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, external_id)
);

CREATE INDEX IF NOT EXISTS store_listings_product_idx ON spendless.store_listings(product_id);
CREATE INDEX IF NOT EXISTS store_listings_checked_idx ON spendless.store_listings(store_id, last_checked_at);

-- ── Import runs ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spendless.import_runs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source text NOT NULL CHECK (source ~ '^[a-z0-9-]{1,40}$'),
  started_at timestamptz NOT NULL,
  finished_at timestamptz NOT NULL DEFAULT now(),
  -- ok: finished · partial: stopped at the page cap or after some errors ·
  -- blocked: the store refused us (403/429/captcha) and we stopped for the day.
  status text NOT NULL CHECK (status IN ('ok', 'partial', 'blocked', 'failed')),
  pages integer NOT NULL DEFAULT 0 CHECK (pages >= 0),
  listings integer NOT NULL DEFAULT 0 CHECK (listings >= 0),
  changed integer NOT NULL DEFAULT 0 CHECK (changed >= 0),
  unchanged integer NOT NULL DEFAULT 0 CHECK (unchanged >= 0),
  new_products integer NOT NULL DEFAULT 0 CHECK (new_products >= 0),
  excluded integer NOT NULL DEFAULT 0 CHECK (excluded >= 0),
  gone integer NOT NULL DEFAULT 0 CHECK (gone >= 0),
  -- A short machine-readable reason (e.g. 'http-403'), never page content.
  note text CHECK (note IS NULL OR char_length(note) <= 200)
);

CREATE INDEX IF NOT EXISTS import_runs_source_idx ON spendless.import_runs(source, started_at DESC);

-- ── Security ─────────────────────────────────────────────────────────────────
ALTER TABLE spendless.store_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE spendless.import_runs ENABLE ROW LEVEL SECURITY;
-- No policies on purpose: these are system tables, not user data.

REVOKE ALL ON spendless.store_listings, spendless.import_runs FROM anon, authenticated;
GRANT ALL ON spendless.store_listings, spendless.import_runs TO service_role;
