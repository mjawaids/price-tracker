-- Duplicate products: merged and retired products, and everything that points at them.
--
-- 1. catalog_products.status gains 'retired' (a public product nobody sells under that
--    name, e.g. an imported "#N/A"), and 'merged' now always comes with merged_into
--    (the product it became). The app hides both and follows merged_into.
-- 2. product_merges: a system table (clients can't read it) logging each merge done by
--    scripts/seed/merge-products.ts — what moved, so it can be undone exactly. An undone
--    merge also keeps that pair apart: the nightly rule never merges it again.
-- 3. price_reports.copy_of: a merge copies a report onto the product it merged into;
--    the copy points at the original, goes when the original is retracted, and isn't
--    counted twice in Your contributions.
-- 4. canonical_product(id): follows merged_into. Writes that still carry a merged id
--    (an old app, an offline list, a queued price check) land on the product it became:
--    list items, usuals, and people's price reports.
--
-- Everything stays SECURITY INVOKER: the triggers read only products the writer can see.

-- ── 1. Product statuses ──────────────────────────────────────────────────────
ALTER TABLE spendless.catalog_products DROP CONSTRAINT IF EXISTS catalog_products_status_check;
ALTER TABLE spendless.catalog_products
  ADD CONSTRAINT catalog_products_status_check CHECK (status IN ('active', 'merged', 'retired'));

ALTER TABLE spendless.catalog_products DROP CONSTRAINT IF EXISTS catalog_products_merged_pair;
ALTER TABLE spendless.catalog_products
  ADD CONSTRAINT catalog_products_merged_pair CHECK ((status = 'merged') = (merged_into IS NOT NULL));

ALTER TABLE spendless.catalog_products DROP CONSTRAINT IF EXISTS catalog_products_not_into_self;
ALTER TABLE spendless.catalog_products
  ADD CONSTRAINT catalog_products_not_into_self CHECK (merged_into IS DISTINCT FROM id);

CREATE INDEX IF NOT EXISTS catalog_products_merged_into_idx
  ON spendless.catalog_products(merged_into) WHERE merged_into IS NOT NULL;

-- ── 2. Merge log (system table) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spendless.product_merges (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  from_id uuid NOT NULL REFERENCES spendless.catalog_products(id) ON DELETE CASCADE,
  into_id uuid NOT NULL REFERENCES spendless.catalog_products(id) ON DELETE CASCADE,
  -- same-name: the nightly rule · approved: a pair the owner listed in Catalog jobs
  rule text NOT NULL CHECK (rule IN ('same-name', 'approved')),
  -- What the merge moved: listings, list items, usuals, copied reports (ids only).
  moved jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (pg_column_size(moved) <= 1048576),
  merged_at timestamptz NOT NULL DEFAULT now(),
  undone_at timestamptz,
  CONSTRAINT product_merges_two_products CHECK (from_id <> into_id)
);

CREATE INDEX IF NOT EXISTS product_merges_from_idx ON spendless.product_merges(from_id);
CREATE INDEX IF NOT EXISTS product_merges_into_idx ON spendless.product_merges(into_id);

ALTER TABLE spendless.product_merges ENABLE ROW LEVEL SECURITY;
-- No policies: only the merge script (table owner) reads and writes it.
REVOKE ALL ON spendless.product_merges FROM anon, authenticated;
GRANT ALL ON spendless.product_merges TO service_role;

-- ── 3. Copies of reports ─────────────────────────────────────────────────────
ALTER TABLE spendless.price_reports
  ADD COLUMN IF NOT EXISTS copy_of uuid REFERENCES spendless.price_reports(id) ON DELETE CASCADE;
-- Copies are rare; this keeps deleting a report (corrections, retractions) cheap.
CREATE INDEX IF NOT EXISTS price_reports_copy_of_idx
  ON spendless.price_reports(copy_of) WHERE copy_of IS NOT NULL;

-- ── 4. Follow merges ─────────────────────────────────────────────────────────
-- The product an id stands for now: itself, or where its merges lead (10 steps at most).
-- An id the caller can't see, or that doesn't exist, comes back unchanged.
CREATE OR REPLACE FUNCTION spendless.canonical_product(p_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH RECURSIVE chain(id, next, depth) AS (
    SELECT p.id, p.merged_into, 0
    FROM spendless.catalog_products p
    WHERE p.id = p_id
    UNION ALL
    SELECT p.id, p.merged_into, c.depth + 1
    FROM chain c
    JOIN spendless.catalog_products p ON p.id = c.next
    WHERE c.depth < 10
  )
  SELECT coalesce((SELECT c.id FROM chain c ORDER BY c.depth DESC LIMIT 1), p_id);
$$;

REVOKE ALL ON FUNCTION spendless.canonical_product(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION spendless.canonical_product(uuid) TO authenticated, service_role;

-- List items: the pinned product and the planned one.
CREATE OR REPLACE FUNCTION spendless.list_items_follow_merges()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.product_id IS NOT NULL THEN
    NEW.product_id := spendless.canonical_product(NEW.product_id);
  END IF;
  IF NEW.plan_product_id IS NOT NULL THEN
    NEW.plan_product_id := spendless.canonical_product(NEW.plan_product_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS list_items_follow_merges ON spendless.list_items;
CREATE TRIGGER list_items_follow_merges
  BEFORE INSERT OR UPDATE ON spendless.list_items
  FOR EACH ROW EXECUTE FUNCTION spendless.list_items_follow_merges();

-- Usuals: the reference product and the exact list (order kept, duplicates dropped).
CREATE OR REPLACE FUNCTION spendless.item_preferences_follow_merges()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.ref_product_id IS NOT NULL THEN
    NEW.ref_product_id := spendless.canonical_product(NEW.ref_product_id);
  END IF;
  IF cardinality(NEW.product_ids) > 0 THEN
    NEW.product_ids := ARRAY(
      SELECT d.id FROM (
        SELECT DISTINCT ON (c.id) c.id, u.ord
        FROM unnest(NEW.product_ids) WITH ORDINALITY AS u(id, ord)
        CROSS JOIN LATERAL (SELECT spendless.canonical_product(u.id) AS id) c
        ORDER BY c.id, u.ord
      ) d
      ORDER BY d.ord
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS item_preferences_follow_merges ON spendless.item_preferences;
CREATE TRIGGER item_preferences_follow_merges
  BEFORE INSERT OR UPDATE ON spendless.item_preferences
  FOR EACH ROW EXECUTE FUNCTION spendless.item_preferences_follow_merges();

-- People's price reports: the checks from 20261005000000_compare_catalog.sql, after
-- following merges. A copy is only ever made by the merge script.
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
  NEW.copy_of := NULL;
  NEW.product_id := spendless.canonical_product(NEW.product_id);

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

-- Trigger functions are never called directly.
REVOKE ALL ON FUNCTION spendless.price_reports_before_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION spendless.list_items_follow_merges() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION spendless.item_preferences_follow_merges() FROM PUBLIC, anon, authenticated;

-- ── Your contributions: a merge's copies aren't counted again ────────────────
CREATE OR REPLACE FUNCTION spendless.my_contributions(p_month_start timestamptz)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH mine AS (
    SELECT r.store_id, r.created_at,
      CASE
        WHEN r.source = 'dispute' THEN 'disputes'
        WHEN r.price IS NULL OR NOT r.is_available THEN 'out_of_stock'
        WHEN s.owner_id IS NOT NULL THEN 'private'
        WHEN r.status = 'pending' THEN 'held'
        WHEN r.status = 'accepted' AND s.id IS NOT NULL THEN 'shared'
        ELSE 'other'
      END AS kind
    FROM spendless.price_reports r
    LEFT JOIN spendless.catalog_stores s ON s.id = r.store_id
    WHERE r.user_id = auth.uid() AND r.copy_of IS NULL
  )
  SELECT jsonb_build_object(
    'total', count(*),
    'month', count(*) FILTER (WHERE created_at >= coalesce(p_month_start, date_trunc('month', now()))),
    'shops', count(DISTINCT store_id),
    'shared', count(*) FILTER (WHERE kind = 'shared'),
    'held', count(*) FILTER (WHERE kind = 'held'),
    'private', count(*) FILTER (WHERE kind = 'private'),
    'out_of_stock', count(*) FILTER (WHERE kind = 'out_of_stock'),
    'disputes', count(*) FILTER (WHERE kind = 'disputes'),
    'other', count(*) FILTER (WHERE kind = 'other')
  )
  FROM mine;
$$;

REVOKE ALL ON FUNCTION spendless.my_contributions(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION spendless.my_contributions(timestamptz) TO authenticated, service_role;
