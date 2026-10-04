/*
  # Compare v2: shared catalogue, price reports and plans

  1. New tables (all in `spendless`)
    - `regions` — cities. `status = 'live'` turns on shared prices; `gathering`
      cities run Compare in personal mode.
    - `catalog_stores` — stores. `owner_id IS NULL` = public (shared with everyone);
      otherwise private to that user (their corner shop, or any store in a city
      that isn't live yet). Public stores always belong to a region.
    - `catalog_products` — products with structured brand / item type / size so a
      list item ("bread") can be matched to them. Same public/private rule.
    - `price_reports` — append-only price observations. Nobody edits a price; they
      add a report. `user_id IS NULL` = a system source (store import / feed).
    - `current_prices` — the price shown per (store, product): a weighted median
      of recent reports, maintained by triggers on `price_reports`.
    - `user_stores` — the stores a user shops at ("my stores").
    - `item_preferences` — a user's "usual" for a list item name.
    - `plans` — plans a user applied to a list (powers "saved this month").

  2. `list_items` gains `plan_store_id`, `plan_product_id`, `plan_price` (the plan
     applied to the list). `product_id` is re-pointed to `catalog_products` by
     20261005000100_compare_copy_personal_data.sql, after the copy.

  3. Security
    - RLS everywhere. Public catalogue rows are read-only for clients; users
      create, edit and delete only their own private rows.
    - Price reports: users insert only their own, for stores/products they can
      see, with a recent date, and only user sources (never import/feed). They
      read and delete only their own; nobody updates one.
    - A rate limit (500 reports/day/user) and a correction rule (a new report for
      the same store and product within 10 minutes replaces the previous one).
    - A report at a public store that is >40% away from the current price is held
      as `pending` (not counted) until it's corroborated.
    - `current_prices` is written only by `spendless.refresh_current_prices()`,
      a SECURITY DEFINER trigger function (it must aggregate every user's
      reports). search_path is pinned and EXECUTE is revoked from client roles.

  4. Notes
    - Idempotent: safe to run more than once.
    - Item types are a curated vocabulary in the app (src/lib/compare/itemTypes.ts);
      the column only checks the slug format.
*/

-- ── Regions ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spendless.regions (
  id text PRIMARY KEY CHECK (id ~ '^[a-z0-9-]{2,40}$'),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  country_code text NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  status text NOT NULL DEFAULT 'gathering' CHECK (status IN ('live', 'gathering')),
  sort_order integer NOT NULL DEFAULT 0
);

INSERT INTO spendless.regions (id, name, country_code, currency, status, sort_order) VALUES
  ('karachi', 'Karachi', 'PK', 'PKR', 'live', 1),
  ('lahore', 'Lahore', 'PK', 'PKR', 'gathering', 2),
  ('islamabad', 'Islamabad', 'PK', 'PKR', 'gathering', 3),
  ('rawalpindi', 'Rawalpindi', 'PK', 'PKR', 'gathering', 4),
  ('faisalabad', 'Faisalabad', 'PK', 'PKR', 'gathering', 5),
  ('multan', 'Multan', 'PK', 'PKR', 'gathering', 6),
  ('hyderabad', 'Hyderabad', 'PK', 'PKR', 'gathering', 7),
  ('peshawar', 'Peshawar', 'PK', 'PKR', 'gathering', 8),
  ('quetta', 'Quetta', 'PK', 'PKR', 'gathering', 9)
ON CONFLICT (id) DO NOTHING;

-- ── Stores ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spendless.catalog_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  region_id text REFERENCES spendless.regions(id),
  chain text CHECK (chain IS NULL OR char_length(chain) BETWEEN 1 AND 60),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  kind text NOT NULL CHECK (kind IN ('physical', 'online')),
  address text CHECK (address IS NULL OR char_length(address) <= 200),
  city text CHECK (city IS NULL OR char_length(city) <= 60),
  lat double precision CHECK (lat IS NULL OR lat BETWEEN -90 AND 90),
  lng double precision CHECK (lng IS NULL OR lng BETWEEN -180 AND 180),
  -- {"type":"none"|"free"} | {"type":"flat","fee":n} | {"type":"over","threshold":n,"fee":n}
  -- plus an optional "minOrder": n. Numbers must be ≥ 0 (jsonb orders strings below numbers).
  delivery_rule jsonb NOT NULL DEFAULT '{"type":"none"}'::jsonb CHECK (
    jsonb_typeof(delivery_rule) = 'object'
    AND delivery_rule->>'type' IN ('none', 'free', 'flat', 'over')
    AND (delivery_rule->>'type' NOT IN ('flat', 'over')
         OR (jsonb_typeof(delivery_rule->'fee') = 'number' AND delivery_rule->'fee' >= '0'::jsonb))
    AND (delivery_rule->>'type' <> 'over'
         OR (jsonb_typeof(delivery_rule->'threshold') = 'number' AND delivery_rule->'threshold' >= '0'::jsonb))
    AND (NOT delivery_rule ? 'minOrder'
         OR (jsonb_typeof(delivery_rule->'minOrder') = 'number' AND delivery_rule->'minOrder' >= '0'::jsonb))
  ),
  website text CHECK (website IS NULL OR (website ~* '^https?://[^[:space:]]+$' AND char_length(website) <= 300)),
  phone text CHECK (phone IS NULL OR char_length(phone) <= 40),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_stores_public_has_region CHECK (owner_id IS NOT NULL OR region_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS catalog_stores_owner_idx ON spendless.catalog_stores(owner_id);
CREATE INDEX IF NOT EXISTS catalog_stores_region_idx ON spendless.catalog_stores(region_id) WHERE owner_id IS NULL;

-- ── Products ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spendless.catalog_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
  brand text CHECK (brand IS NULL OR char_length(brand) BETWEEN 1 AND 60),
  variant text CHECK (variant IS NULL OR char_length(variant) <= 80),
  item_type text CHECK (item_type IS NULL OR item_type ~ '^[a-z0-9-]{1,40}$'),
  category text CHECK (category IS NULL OR char_length(category) <= 60),
  -- Size of ONE unit (e.g. 250 ml) and how many come in the pack (e.g. 12).
  size_value numeric CHECK (size_value IS NULL OR size_value > 0),
  size_unit text CHECK (size_unit IS NULL OR size_unit IN ('g', 'ml', 'pc')),
  pack_count integer NOT NULL DEFAULT 1 CHECK (pack_count BETWEEN 1 AND 1000),
  -- Free-text size as the user typed it ("1 dozen"), shown when there's no parsed size.
  unit_label text CHECK (unit_label IS NULL OR char_length(unit_label) <= 40),
  gtin text CHECK (gtin IS NULL OR gtin ~ '^[0-9]{8,14}$'),
  image_url text CHECK (image_url IS NULL OR (image_url ~* '^https://[^[:space:]]+$' AND char_length(image_url) <= 500)),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'merged')),
  merged_into uuid REFERENCES spendless.catalog_products(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_products_size_pair CHECK ((size_value IS NULL) = (size_unit IS NULL))
);

CREATE INDEX IF NOT EXISTS catalog_products_owner_idx ON spendless.catalog_products(owner_id);
CREATE INDEX IF NOT EXISTS catalog_products_item_type_idx ON spendless.catalog_products(item_type);
CREATE INDEX IF NOT EXISTS catalog_products_updated_idx ON spendless.catalog_products(updated_at);
CREATE UNIQUE INDEX IF NOT EXISTS catalog_products_public_gtin_idx
  ON spendless.catalog_products(gtin) WHERE gtin IS NOT NULL AND owner_id IS NULL;

-- ── Price reports (append-only) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spendless.price_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES spendless.catalog_stores(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES spendless.catalog_products(id) ON DELETE CASCADE,
  -- Price of one pack. May be empty only for an "out of stock" report.
  price numeric(12, 2) CHECK (price IS NULL OR (price > 0 AND price < 10000000)),
  currency text CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$'),
  is_available boolean NOT NULL DEFAULT true,
  observed_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL CHECK (source IN ('manual', 'trip', 'confirm', 'dispute', 'receipt', 'import', 'feed')),
  status text NOT NULL DEFAULT 'accepted' CHECK (status IN ('accepted', 'pending', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT price_reports_price_or_unavailable CHECK (price IS NOT NULL OR NOT is_available)
);

CREATE INDEX IF NOT EXISTS price_reports_pair_idx ON spendless.price_reports(store_id, product_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS price_reports_user_idx ON spendless.price_reports(user_id, created_at DESC);

-- ── Current prices (derived) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spendless.current_prices (
  store_id uuid NOT NULL REFERENCES spendless.catalog_stores(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES spendless.catalog_products(id) ON DELETE CASCADE,
  price numeric(12, 2),
  currency text,
  is_available boolean NOT NULL,
  observed_at timestamptz NOT NULL,
  n_reports integer NOT NULL,
  confidence real NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, product_id)
);

CREATE INDEX IF NOT EXISTS current_prices_product_idx ON spendless.current_prices(product_id);
CREATE INDEX IF NOT EXISTS current_prices_updated_idx ON spendless.current_prices(updated_at);

-- ── Per-user tables ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spendless.user_stores (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES spendless.catalog_stores(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, store_id)
);

CREATE TABLE IF NOT EXISTS spendless.item_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Normalized list item name ("bread"), see normalizeName() in the app.
  item_key text NOT NULL CHECK (char_length(item_key) BETWEEN 1 AND 120),
  -- exact: only product_ids · brand_size: ref's brand, similar size · any_size: any brand, similar size
  mode text NOT NULL CHECK (mode IN ('exact', 'brand_size', 'any_size')),
  product_ids uuid[] NOT NULL DEFAULT '{}' CHECK (cardinality(product_ids) <= 50),
  ref_product_id uuid REFERENCES spendless.catalog_products(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_key)
);

CREATE TABLE IF NOT EXISTS spendless.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  list_id uuid REFERENCES spendless.lists(id) ON DELETE SET NULL,
  region_id text REFERENCES spendless.regions(id),
  currency text CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$'),
  total numeric(12, 2) NOT NULL CHECK (total >= 0),
  baseline_total numeric(12, 2) CHECK (baseline_total IS NULL OR baseline_total >= 0),
  savings numeric(12, 2) NOT NULL DEFAULT 0 CHECK (savings >= 0),
  store_count integer NOT NULL CHECK (store_count BETWEEN 0 AND 20),
  item_count integer NOT NULL CHECK (item_count BETWEEN 0 AND 500),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (pg_column_size(payload) <= 65536),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS plans_user_created_idx ON spendless.plans(user_id, created_at DESC);

-- ── Lists: the plan applied to each item ─────────────────────────────────────
ALTER TABLE spendless.list_items
  ADD COLUMN IF NOT EXISTS plan_store_id uuid REFERENCES spendless.catalog_stores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS plan_product_id uuid REFERENCES spendless.catalog_products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS plan_price numeric(12, 2) CHECK (plan_price IS NULL OR plan_price >= 0);

-- ── updated_at (server-set, so clients can pull changes since a cursor) ──────
DROP TRIGGER IF EXISTS catalog_stores_set_updated_at ON spendless.catalog_stores;
CREATE TRIGGER catalog_stores_set_updated_at
  BEFORE INSERT OR UPDATE ON spendless.catalog_stores
  FOR EACH ROW EXECUTE FUNCTION spendless.set_server_updated_at();

DROP TRIGGER IF EXISTS catalog_products_set_updated_at ON spendless.catalog_products;
CREATE TRIGGER catalog_products_set_updated_at
  BEFORE INSERT OR UPDATE ON spendless.catalog_products
  FOR EACH ROW EXECUTE FUNCTION spendless.set_server_updated_at();

DROP TRIGGER IF EXISTS item_preferences_set_updated_at ON spendless.item_preferences;
CREATE TRIGGER item_preferences_set_updated_at
  BEFORE INSERT OR UPDATE ON spendless.item_preferences
  FOR EACH ROW EXECUTE FUNCTION spendless.set_server_updated_at();

-- ── Price report checks (runs as the reporting user) ─────────────────────────
CREATE OR REPLACE FUNCTION spendless.price_reports_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  uid uuid := auth.uid();
  cur numeric;
BEGIN
  -- Migrations, scripts and the service role (no signed-in user) are trusted.
  IF uid IS NULL THEN
    RETURN NEW;
  END IF;
  NEW.created_at := now(); -- the rate limit counts by created_at; clients can't backdate it

  IF (SELECT count(*) FROM spendless.price_reports r
      WHERE r.user_id = uid AND r.created_at > now() - interval '1 day') >= 500 THEN
    RAISE EXCEPTION 'Too many price reports today' USING ERRCODE = '54000';
  END IF;

  -- A new report for the same store and product within 10 minutes is a correction.
  DELETE FROM spendless.price_reports r
  WHERE r.user_id = uid AND r.store_id = NEW.store_id AND r.product_id = NEW.product_id
    AND r.created_at > now() - interval '10 minutes';

  -- At a public store, hold a report far from the current price until it's corroborated.
  NEW.status := 'accepted';
  IF NEW.price IS NOT NULL AND NEW.source <> 'dispute' AND EXISTS (
    SELECT 1 FROM spendless.catalog_stores s WHERE s.id = NEW.store_id AND s.owner_id IS NULL
  ) THEN
    SELECT c.price INTO cur FROM spendless.current_prices c
    WHERE c.store_id = NEW.store_id AND c.product_id = NEW.product_id AND c.n_reports > 0;
    IF cur IS NOT NULL AND cur > 0 AND abs(NEW.price - cur) / cur > 0.4 THEN
      NEW.status := 'pending';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS price_reports_check ON spendless.price_reports;
CREATE TRIGGER price_reports_check
  BEFORE INSERT ON spendless.price_reports
  FOR EACH ROW EXECUTE FUNCTION spendless.price_reports_before_insert();

-- ── Current price = weighted median of recent reports ────────────────────────
-- Weights: source (feed/receipt 1.0, import 0.9, trip/confirm 0.8, manual 0.6) ×
-- recency (halves every 10 days). Reports from the last 30 days count; if there
-- are none, the latest report stands (the app labels it as old). The newest
-- report decides availability. Runs once per statement over the changed pairs.
CREATE OR REPLACE FUNCTION spendless.refresh_current_prices()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Pairs with no counted report left lose their current price.
  DELETE FROM spendless.current_prices c
  USING (SELECT DISTINCT store_id, product_id FROM changed) p
  WHERE c.store_id = p.store_id AND c.product_id = p.product_id
    AND NOT EXISTS (
      SELECT 1 FROM spendless.price_reports r
      WHERE r.store_id = c.store_id AND r.product_id = c.product_id
        AND r.status = 'accepted' AND r.source <> 'dispute'
    );

  -- One pass, no joins between derived sets: their row estimates are poor, and a
  -- join planned on a bad estimate turns a bulk insert into minutes.
  WITH pairs AS (
    SELECT DISTINCT store_id, product_id FROM changed
  ),
  ranked AS (
    SELECT r.store_id, r.product_id, r.price, r.currency, r.is_available, r.observed_at, r.source,
      row_number() OVER (PARTITION BY r.store_id, r.product_id ORDER BY r.observed_at DESC, r.created_at DESC) AS rn
    FROM spendless.price_reports r
    JOIN pairs p ON p.store_id = r.store_id AND p.product_id = r.product_id
    WHERE r.status = 'accepted' AND r.source <> 'dispute'
  ),
  weighted AS (
    SELECT k.*,
      (CASE k.source WHEN 'feed' THEN 1.0 WHEN 'receipt' THEN 1.0 WHEN 'import' THEN 0.9
                     WHEN 'trip' THEN 0.8 WHEN 'confirm' THEN 0.8 ELSE 0.6 END)
      * power(0.5::double precision, greatest(0, extract(epoch FROM now() - k.observed_at)) / 864000.0) AS weight
    FROM ranked k
    WHERE k.observed_at > now() - interval '30 days' OR k.rn = 1
  ),
  cumulative AS (
    SELECT w.*,
      sum(w.weight) FILTER (WHERE w.price IS NOT NULL)
        OVER (PARTITION BY w.store_id, w.product_id ORDER BY w.price, w.observed_at ROWS UNBOUNDED PRECEDING) AS cum,
      sum(w.weight) FILTER (WHERE w.price IS NOT NULL)
        OVER (PARTITION BY w.store_id, w.product_id) AS total
    FROM weighted w
  )
  INSERT INTO spendless.current_prices AS cp
    (store_id, product_id, price, currency, is_available, observed_at, n_reports, confidence, updated_at)
  SELECT c.store_id, c.product_id,
    -- weighted median: the lowest price at which half the weight is reached
    min(c.price) FILTER (WHERE c.price IS NOT NULL AND c.cum >= c.total / 2),
    (array_agg(c.currency ORDER BY c.observed_at DESC) FILTER (WHERE c.currency IS NOT NULL))[1],
    (array_agg(c.is_available ORDER BY c.observed_at DESC))[1],
    max(c.observed_at),
    count(*)::integer,
    least(1.0, sum(c.weight))::real,
    now()
  FROM cumulative c
  GROUP BY c.store_id, c.product_id
  ON CONFLICT (store_id, product_id) DO UPDATE SET
    price = EXCLUDED.price,
    currency = EXCLUDED.currency,
    is_available = EXCLUDED.is_available,
    observed_at = EXCLUDED.observed_at,
    n_reports = EXCLUDED.n_reports,
    confidence = EXCLUDED.confidence,
    updated_at = now();
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS price_reports_refresh_after_insert ON spendless.price_reports;
CREATE TRIGGER price_reports_refresh_after_insert
  AFTER INSERT ON spendless.price_reports
  REFERENCING NEW TABLE AS changed
  FOR EACH STATEMENT EXECUTE FUNCTION spendless.refresh_current_prices();

DROP TRIGGER IF EXISTS price_reports_refresh_after_delete ON spendless.price_reports;
CREATE TRIGGER price_reports_refresh_after_delete
  AFTER DELETE ON spendless.price_reports
  REFERENCING OLD TABLE AS changed
  FOR EACH STATEMENT EXECUTE FUNCTION spendless.refresh_current_prices();

DROP TRIGGER IF EXISTS price_reports_refresh_after_update ON spendless.price_reports;
CREATE TRIGGER price_reports_refresh_after_update
  AFTER UPDATE ON spendless.price_reports
  REFERENCING NEW TABLE AS changed
  FOR EACH STATEMENT EXECUTE FUNCTION spendless.refresh_current_prices();

-- ── Row level security ───────────────────────────────────────────────────────
ALTER TABLE spendless.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE spendless.catalog_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE spendless.catalog_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE spendless.price_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE spendless.current_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE spendless.user_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE spendless.item_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE spendless.plans ENABLE ROW LEVEL SECURITY;

-- Regions are reference data (not user data): readable when signed in, never writable.
DROP POLICY IF EXISTS "Signed-in users can read regions" ON spendless.regions;
CREATE POLICY "Signed-in users can read regions"
  ON spendless.regions FOR SELECT TO authenticated
  USING (true);

-- Stores: public + your own; you manage only your own.
DROP POLICY IF EXISTS "Read public and own stores" ON spendless.catalog_stores;
CREATE POLICY "Read public and own stores"
  ON spendless.catalog_stores FOR SELECT TO authenticated
  USING (owner_id IS NULL OR owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Create own stores" ON spendless.catalog_stores;
CREATE POLICY "Create own stores"
  ON spendless.catalog_stores FOR INSERT TO authenticated
  WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Update own stores" ON spendless.catalog_stores;
CREATE POLICY "Update own stores"
  ON spendless.catalog_stores FOR UPDATE TO authenticated
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Delete own stores" ON spendless.catalog_stores;
CREATE POLICY "Delete own stores"
  ON spendless.catalog_stores FOR DELETE TO authenticated
  USING (owner_id = (SELECT auth.uid()));

-- Products: same rule.
DROP POLICY IF EXISTS "Read public and own products" ON spendless.catalog_products;
CREATE POLICY "Read public and own products"
  ON spendless.catalog_products FOR SELECT TO authenticated
  USING (owner_id IS NULL OR owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Create own products" ON spendless.catalog_products;
CREATE POLICY "Create own products"
  ON spendless.catalog_products FOR INSERT TO authenticated
  WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Update own products" ON spendless.catalog_products;
CREATE POLICY "Update own products"
  ON spendless.catalog_products FOR UPDATE TO authenticated
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Delete own products" ON spendless.catalog_products;
CREATE POLICY "Delete own products"
  ON spendless.catalog_products FOR DELETE TO authenticated
  USING (owner_id = (SELECT auth.uid()));

-- Price reports: add your own (user sources only, things you can see, recent dates);
-- read and retract your own. No updates.
DROP POLICY IF EXISTS "Read own price reports" ON spendless.price_reports;
CREATE POLICY "Read own price reports"
  ON spendless.price_reports FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Add own price reports" ON spendless.price_reports;
CREATE POLICY "Add own price reports"
  ON spendless.price_reports FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND source IN ('manual', 'trip', 'confirm', 'dispute', 'receipt')
    AND status IN ('accepted', 'pending')
    AND observed_at <= now() + interval '5 minutes'
    AND observed_at >= now() - interval '90 days'
    AND EXISTS (
      SELECT 1 FROM spendless.catalog_stores s
      WHERE s.id = store_id AND (s.owner_id IS NULL OR s.owner_id = (SELECT auth.uid()))
    )
    AND EXISTS (
      SELECT 1 FROM spendless.catalog_products p
      WHERE p.id = product_id AND (p.owner_id IS NULL OR p.owner_id = (SELECT auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Retract own price reports" ON spendless.price_reports;
CREATE POLICY "Retract own price reports"
  ON spendless.price_reports FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Current prices: readable when you can see both the store and the product.
DROP POLICY IF EXISTS "Read visible current prices" ON spendless.current_prices;
CREATE POLICY "Read visible current prices"
  ON spendless.current_prices FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM spendless.catalog_stores s
      WHERE s.id = store_id AND (s.owner_id IS NULL OR s.owner_id = (SELECT auth.uid()))
    )
    AND EXISTS (
      SELECT 1 FROM spendless.catalog_products p
      WHERE p.id = product_id AND (p.owner_id IS NULL OR p.owner_id = (SELECT auth.uid()))
    )
  );

-- My stores: only stores you can see.
DROP POLICY IF EXISTS "Users can manage their own store picks" ON spendless.user_stores;
CREATE POLICY "Users can manage their own store picks"
  ON spendless.user_stores FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM spendless.catalog_stores s
      WHERE s.id = store_id AND (s.owner_id IS NULL OR s.owner_id = (SELECT auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can manage their own item preferences" ON spendless.item_preferences;
CREATE POLICY "Users can manage their own item preferences"
  ON spendless.item_preferences FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can manage their own plans" ON spendless.plans;
CREATE POLICY "Users can manage their own plans"
  ON spendless.plans FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (list_id IS NULL OR EXISTS (
      SELECT 1 FROM spendless.lists l WHERE l.id = list_id AND l.user_id = (SELECT auth.uid())
    ))
  );

-- ── Grants ───────────────────────────────────────────────────────────────────
GRANT ALL ON spendless.regions, spendless.catalog_stores, spendless.catalog_products,
  spendless.price_reports, spendless.current_prices, spendless.user_stores,
  spendless.item_preferences, spendless.plans
  TO anon, authenticated, service_role;

-- Trigger functions are never called directly; the schema's default privileges
-- would otherwise grant EXECUTE to client roles. The SECURITY DEFINER one matters most.
REVOKE ALL ON FUNCTION spendless.refresh_current_prices() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION spendless.price_reports_before_insert() FROM PUBLIC, anon, authenticated;
