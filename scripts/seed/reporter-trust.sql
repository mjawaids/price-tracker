-- Reporter trust: the SQL side of scripts/seed/reporter-trust.ts. One transaction;
-- prints one JSON line of counts, then COMMITs (commit=on) or ROLLs BACK (commit=off).
-- Variables (validated by the script): window_days, min_compared, commit.
--
-- Each person's prices at shared stores from the last window_days (accepted ones, and
-- held ones that nobody confirmed within 14 days) are compared with OTHER people's
-- accepted prices for the same store and product within ±14 days (imports included).
-- A price agrees when at least half of those are within 15% of it (a vote, not an
-- average, so one person's wrong prices can't drag the reference). With fewer than
-- min_compared comparable
-- prices the weight stays 1; otherwise
--   s = (agreed + 3) / (compared + 4),  weight = clamp(0.5, 1.2, 1 + 2 × (s − 0.75)).
-- refresh_current_prices() multiplies a person's report weights by it the next time a
-- pair's price is worked out. Runs as the database owner; prints counts only.
\set ON_ERROR_STOP on
BEGIN;
SELECT pg_advisory_xact_lock(hashtextextended('spendless.reporter_trust', 0)) \gset lock_

CREATE TEMP TABLE mine ON COMMIT DROP AS
SELECT r.user_id, r.store_id, r.product_id, r.price, r.observed_at
FROM spendless.price_reports r
JOIN spendless.catalog_stores s ON s.id = r.store_id AND s.owner_id IS NULL
WHERE r.user_id IS NOT NULL AND r.price IS NOT NULL
  AND r.source IN ('manual', 'trip', 'confirm', 'receipt')
  AND r.observed_at > now() - make_interval(days => :'window_days'::int)
  AND (r.status = 'accepted' OR (r.status = 'pending' AND r.observed_at < now() - interval '14 days'));

CREATE TEMP TABLE cmp ON COMMIT DROP AS
SELECT m.user_id, o.n AS others, o.close
FROM mine m
CROSS JOIN LATERAL (
  SELECT count(*) AS n, count(*) FILTER (WHERE abs(q.price - m.price) <= 0.15 * q.price) AS close
  FROM spendless.price_reports q
  WHERE q.store_id = m.store_id AND q.product_id = m.product_id
    AND q.user_id IS DISTINCT FROM m.user_id
    AND q.status = 'accepted' AND q.source <> 'dispute' AND q.price IS NOT NULL
    AND q.observed_at BETWEEN m.observed_at - interval '14 days' AND m.observed_at + interval '14 days'
) o;

CREATE TEMP TABLE scored ON COMMIT DROP AS
SELECT x.user_id, x.compared, x.agreed,
  CASE WHEN x.compared < :'min_compared'::int THEN 1.0
       ELSE round(least(1.2, greatest(0.5, 1 + 2 * ((x.agreed + 3.0) / (x.compared + 4.0) - 0.75))), 2)
  END::numeric(3, 2) AS weight
FROM (
  SELECT c.user_id,
    count(*) FILTER (WHERE c.others > 0)::int AS compared,
    count(*) FILTER (WHERE c.others > 0 AND 2 * c.close >= c.others)::int AS agreed
  FROM cmp c
  GROUP BY c.user_id
) x
-- auth.users is shared with other apps; only people who still exist.
WHERE EXISTS (SELECT 1 FROM auth.users u WHERE u.id = x.user_id);

-- A weight that changed from what applied before (no row = 1).
SELECT count(*) AS n FROM scored s
LEFT JOIN spendless.reporter_trust t ON t.user_id = s.user_id
WHERE coalesce(t.weight, 1) IS DISTINCT FROM s.weight \gset changed_

INSERT INTO spendless.reporter_trust (user_id, weight, compared, agreed, updated_at)
SELECT user_id, weight, compared, agreed, now() FROM scored
ON CONFLICT (user_id) DO UPDATE SET
  weight = EXCLUDED.weight, compared = EXCLUDED.compared, agreed = EXCLUDED.agreed, updated_at = now();

-- People with nothing to compare any more go back to the default (1).
WITH gone AS (
  DELETE FROM spendless.reporter_trust t WHERE NOT EXISTS (SELECT 1 FROM scored s WHERE s.user_id = t.user_id) RETURNING 1
)
SELECT count(*) AS n FROM gone \gset reset_

SELECT json_build_object(
  'people', (SELECT count(*) FROM scored),
  'compared', (SELECT coalesce(sum(compared), 0) FROM scored),
  'rated', (SELECT count(*) FROM scored WHERE compared >= :'min_compared'::int),
  'above', (SELECT count(*) FROM scored WHERE weight > 1),
  'below', (SELECT count(*) FROM scored WHERE weight < 1),
  'changed', :'changed_n'::int,
  'reset', :'reset_n'::int
);

\if :commit
COMMIT;
\else
ROLLBACK;
\endif
