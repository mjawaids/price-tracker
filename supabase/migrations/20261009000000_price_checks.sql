-- Price checks: held prices that others confirm, "wrong price" reports, reporter trust.
--
-- 1. A price held as `pending` (more than 40% from the current price at a shared store)
--    now counts once someone else agrees: another person, or the store's own import,
--    reports a price within 10% of it, seen within 14 days of it. Two held prices that
--    agree accept each other. Done by refresh_current_prices() for the pairs a
--    statement touched, so it happens at once.
-- 2. "Wrong price" reports (source 'dispute', already allowed by RLS) mark a price as
--    `disputed` in current_prices when at least 2 different people disputed it after
--    its newest counted report (within 30 days). The app leaves disputed prices out of
--    Where to buy and shows them with a warning. Any newer report clears it.
-- 3. reporter_trust: a weight per person (0.5–1.2, 1 when absent) from how often their
--    prices agree with other people's, written nightly by scripts/seed/reporter-trust.ts
--    and multiplied into their reports' weights. System table: clients can't read it.
--
-- refresh_current_prices() stays SECURITY DEFINER (it has to read and now confirm
-- everyone's reports) with search_path pinned and EXECUTE revoked from client roles.

-- ── Reporter trust (system table) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spendless.reporter_trust (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  weight numeric(3, 2) NOT NULL DEFAULT 1 CHECK (weight BETWEEN 0.5 AND 1.2),
  compared integer NOT NULL DEFAULT 0 CHECK (compared >= 0),
  agreed integer NOT NULL DEFAULT 0 CHECK (agreed >= 0 AND agreed <= compared),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE spendless.reporter_trust ENABLE ROW LEVEL SECURITY;
-- No policies: only the nightly job (table owner) and the refresh trigger read it.
REVOKE ALL ON spendless.reporter_trust FROM anon, authenticated;
GRANT ALL ON spendless.reporter_trust TO service_role;

-- ── Disputed prices ──────────────────────────────────────────────────────────
ALTER TABLE spendless.current_prices ADD COLUMN IF NOT EXISTS disputed boolean NOT NULL DEFAULT false;

-- Held prices and disputes are rare; these keep their checks cheap in bulk statements.
CREATE INDEX IF NOT EXISTS price_reports_pending_idx
  ON spendless.price_reports(store_id, product_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS price_reports_dispute_idx
  ON spendless.price_reports(store_id, product_id, observed_at) WHERE source = 'dispute';

-- ── Current price = weighted median of recent reports ────────────────────────
-- Weights: source (feed/receipt 1.0, import 0.9, trip/confirm 0.8, manual 0.6) ×
-- recency (halves every 10 days) × the reporter's trust (1 for system sources and for
-- people without a weight yet). Reports from the last 30 days count; if there are
-- none, the latest report stands (the app labels it as old). The newest report decides
-- availability. Runs once per statement over the changed pairs.
CREATE OR REPLACE FUNCTION spendless.refresh_current_prices()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Held prices that someone else agrees with count from now on. Only at the top
  -- level: this UPDATE fires the trigger again (depth 2), which only recomputes.
  -- Driven from the (few) held reports, never from the changed set, so a bulk import
  -- statement stays fast.
  IF pg_trigger_depth() = 1 THEN
    UPDATE spendless.price_reports r
    SET status = 'accepted'
    WHERE r.status = 'pending' AND r.price IS NOT NULL AND r.source <> 'dispute'
      AND EXISTS (SELECT 1 FROM changed c WHERE c.store_id = r.store_id AND c.product_id = r.product_id)
      AND EXISTS (
        SELECT 1 FROM spendless.price_reports q
        WHERE q.store_id = r.store_id AND q.product_id = r.product_id AND q.id <> r.id
          AND q.user_id IS DISTINCT FROM r.user_id
          AND q.status IN ('accepted', 'pending') AND q.source <> 'dispute' AND q.price IS NOT NULL
          AND abs(q.price - r.price) <= 0.1 * r.price
          AND q.observed_at BETWEEN r.observed_at - interval '14 days' AND r.observed_at + interval '14 days'
      );
  END IF;

  -- Pairs with no counted report left lose their price, as a tombstone rather
  -- than a deleted row: apps sync this table by updated_at and can't see a row
  -- that's gone. n_reports = 0 means "no current price"; a new report revives it.
  UPDATE spendless.current_prices c
  SET price = NULL, is_available = false, n_reports = 0, confidence = 0, disputed = false, updated_at = now()
  FROM (SELECT DISTINCT store_id, product_id FROM changed) p
  WHERE c.store_id = p.store_id AND c.product_id = p.product_id
    AND c.n_reports > 0
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
    SELECT r.store_id, r.product_id, r.price, r.currency, r.is_available, r.observed_at, r.source, r.user_id,
      row_number() OVER (PARTITION BY r.store_id, r.product_id ORDER BY r.observed_at DESC, r.created_at DESC) AS rn
    FROM spendless.price_reports r
    JOIN pairs p ON p.store_id = r.store_id AND p.product_id = r.product_id
    WHERE r.status = 'accepted' AND r.source <> 'dispute'
  ),
  weighted AS (
    SELECT k.*,
      (CASE k.source WHEN 'feed' THEN 1.0 WHEN 'receipt' THEN 1.0 WHEN 'import' THEN 0.9
                     WHEN 'trip' THEN 0.8 WHEN 'confirm' THEN 0.8 ELSE 0.6 END)
      * power(0.5::double precision, greatest(0, extract(epoch FROM now() - k.observed_at)) / 864000.0)
      * (CASE WHEN k.user_id IS NULL THEN 1.0
              ELSE coalesce((SELECT t.weight FROM spendless.reporter_trust t WHERE t.user_id = k.user_id), 1.0) END) AS weight
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
    (store_id, product_id, price, currency, is_available, observed_at, n_reports, confidence, disputed, updated_at)
  SELECT c.store_id, c.product_id,
    -- weighted median: the lowest price at which half the weight is reached
    min(c.price) FILTER (WHERE c.price IS NOT NULL AND c.cum >= c.total / 2),
    (array_agg(c.currency ORDER BY c.observed_at DESC) FILTER (WHERE c.currency IS NOT NULL))[1],
    (array_agg(c.is_available ORDER BY c.observed_at DESC))[1],
    max(c.observed_at),
    count(*)::integer,
    least(1.0, sum(c.weight))::real,
    -- 2+ different people said it's wrong since the newest counted report
    (SELECT count(DISTINCT d.user_id) FROM spendless.price_reports d
     WHERE d.store_id = c.store_id AND d.product_id = c.product_id AND d.source = 'dispute'
       AND d.observed_at > max(c.observed_at) AND d.observed_at > now() - interval '30 days') >= 2,
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
    disputed = EXCLUDED.disputed,
    updated_at = now();
  RETURN NULL;
END;
$$;

-- The trigger function is never called directly; it reads and confirms everyone's
-- reports, so client roles must not execute it.
REVOKE ALL ON FUNCTION spendless.refresh_current_prices() FROM PUBLIC, anon, authenticated;
