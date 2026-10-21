-- Duplicate products that fix themselves (docs/compare-data.md → "Duplicate products").
-- No person reviews merges: rules merge what they're sure of, people's reports add
-- evidence, and an automatic merge that evidence later contradicts is undone.
--
-- 1. store_listings.moved_from: the product a listing last moved away from (the importer
--    re-matched it to another product), so the nightly job merges a product every
--    listing left into where they went, carrying its people's prices, list items and
--    usuals along instead of leaving them behind.
-- 2. product_merges: the automatic rules (import, same-key, near-name, reported) and why
--    a merge was undone (undo_reason).
-- 3. duplicate_reports: a person says two shared products are the same ('same') or that
--    a merged one isn't ('not_same'). Clients add, read and withdraw only their own; the
--    nightly job counts them.
-- No SECURITY DEFINER: the trigger runs as the signed-in user, under RLS.

-- ── 1. Listings that moved ───────────────────────────────────────────────────
ALTER TABLE spendless.store_listings
  ADD COLUMN IF NOT EXISTS moved_from uuid REFERENCES spendless.catalog_products(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS store_listings_moved_from_idx
  ON spendless.store_listings(moved_from) WHERE moved_from IS NOT NULL;

-- ── 2. Merge log: more rules, and why an undo happened ───────────────────────
ALTER TABLE spendless.product_merges DROP CONSTRAINT IF EXISTS product_merges_rule_check;
-- same-name / same-key / near-name / import: nightly rules · reported: people said so ·
-- approved: a pair the owner listed in Catalog jobs (optional, never required)
ALTER TABLE spendless.product_merges ADD CONSTRAINT product_merges_rule_check
  CHECK (rule IN ('same-name', 'approved', 'import', 'same-key', 'near-name', 'reported'));

ALTER TABLE spendless.product_merges ADD COLUMN IF NOT EXISTS undo_reason text;
ALTER TABLE spendless.product_merges DROP CONSTRAINT IF EXISTS product_merges_undo_reason_check;
-- store-lists-both: one store sells both as separate items · prices-apart: their prices
-- drifted apart · people: people said they aren't the same · owner: Catalog jobs
ALTER TABLE spendless.product_merges ADD CONSTRAINT product_merges_undo_reason_check
  CHECK (undo_reason IS NULL OR undo_reason IN ('store-lists-both', 'prices-apart', 'people', 'owner'));

-- ── 3. People's reports ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spendless.duplicate_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  -- same: product_id and other_id are one product · not_same: product_id was merged
  -- into other_id and shouldn't have been
  kind text NOT NULL CHECK (kind IN ('same', 'not_same')),
  product_id uuid NOT NULL REFERENCES spendless.catalog_products(id) ON DELETE CASCADE,
  other_id uuid NOT NULL REFERENCES spendless.catalog_products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT duplicate_reports_two_products CHECK (product_id <> other_id)
);

-- One report per person per pair and kind, whichever way round.
CREATE UNIQUE INDEX IF NOT EXISTS duplicate_reports_pair_idx ON spendless.duplicate_reports
  (user_id, kind, least(product_id, other_id), greatest(product_id, other_id));
CREATE INDEX IF NOT EXISTS duplicate_reports_pair_count_idx ON spendless.duplicate_reports
  (kind, least(product_id, other_id), greatest(product_id, other_id));
CREATE INDEX IF NOT EXISTS duplicate_reports_user_idx ON spendless.duplicate_reports(user_id, created_at);

CREATE OR REPLACE FUNCTION spendless.duplicate_reports_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  -- Migrations and scripts (no signed-in user) are trusted.
  IF uid IS NULL THEN
    RETURN NEW;
  END IF;
  NEW.user_id := uid;
  NEW.created_at := now();
  -- One at a time per user, so the daily cap can't be raced.
  PERFORM pg_advisory_xact_lock(hashtextextended('spendless.duplicate_reports:' || uid::text, 0));
  IF (SELECT count(*) FROM spendless.duplicate_reports d
      WHERE d.user_id = uid AND d.created_at > now() - interval '1 day') >= 30 THEN
    RAISE EXCEPTION 'Too many reports today' USING ERRCODE = '54000';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS duplicate_reports_check ON spendless.duplicate_reports;
CREATE TRIGGER duplicate_reports_check
  BEFORE INSERT ON spendless.duplicate_reports
  FOR EACH ROW EXECUTE FUNCTION spendless.duplicate_reports_before_insert();

ALTER TABLE spendless.duplicate_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read own duplicate reports" ON spendless.duplicate_reports;
CREATE POLICY "Read own duplicate reports"
  ON spendless.duplicate_reports FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- 'same': two active shared products. 'not_same': a shared product merged into the other.
DROP POLICY IF EXISTS "Report own duplicates" ON spendless.duplicate_reports;
CREATE POLICY "Report own duplicates"
  ON spendless.duplicate_reports FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM spendless.catalog_products o
      WHERE o.id = other_id AND o.owner_id IS NULL AND o.status = 'active'
    )
    AND EXISTS (
      SELECT 1 FROM spendless.catalog_products p
      WHERE p.id = product_id AND p.owner_id IS NULL
        AND ((kind = 'same' AND p.status = 'active')
             OR (kind = 'not_same' AND p.status = 'merged' AND p.merged_into IS NOT NULL))
    )
  );

DROP POLICY IF EXISTS "Withdraw own duplicate reports" ON spendless.duplicate_reports;
CREATE POLICY "Withdraw own duplicate reports"
  ON spendless.duplicate_reports FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

GRANT ALL ON spendless.duplicate_reports TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION spendless.duplicate_reports_before_insert() FROM PUBLIC, anon, authenticated;
