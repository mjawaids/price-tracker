-- Shared shops from suggestions: the SQL side of scripts/seed/promote-suggestions.ts.
-- One transaction: it decides, writes, prints one JSON line of counts, then COMMITs
-- (commit=on) or ROLLs BACK (commit=off: a full rehearsal that changes nothing).
-- Variables (validated by the script): min_people, max_new, account_days, shop_days,
-- cool_hours, min_products, window_days, commit.
--
-- Runs as the database owner with no signed-in user, so RLS and the price report
-- checks don't apply; everything here is the job's own rules. Nothing it prints
-- names a person: counts, plus the names of shops that became shared.
\set ON_ERROR_STOP on
BEGIN;
-- One run at a time.
SELECT pg_advisory_xact_lock(hashtextextended('spendless.promote_suggestions', 0)) \gset lock_

-- Open suggestions and their shops stay put while we decide (a withdraw waits).
SELECT count(*) AS n FROM (
  SELECT 1 FROM spendless.branch_suggestions b
  LEFT JOIN spendless.catalog_stores s ON s.id = b.store_id
  WHERE b.status = 'open'
  FOR UPDATE OF b
) l \gset locked_

-- Suggestions whose shop was deleted, or isn't the person's own in-store shop any more
-- (e.g. changed to an online store).
WITH gone AS (
  DELETE FROM spendless.branch_suggestions b
  WHERE b.status = 'open' AND (
    b.store_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM spendless.catalog_stores s WHERE s.id = b.store_id AND s.owner_id = b.user_id AND s.kind = 'physical'
    )
  )
  RETURNING 1
)
SELECT count(*) AS n FROM gone \gset gone_

-- ── Candidates ───────────────────────────────────────────────────────────────
-- Open suggestions of a shop that's still the person's own, open, in-store and in the
-- same live city. `movable`: the person can be moved (a real, active account; the
-- suggestion had a day to be withdrawn). `counts`: also counts toward the minimum.
CREATE TEMP TABLE cand ON COMMIT DROP AS
SELECT b.id, b.user_id, b.store_id, b.region_id, b.chain, b.area, b.chain_key, b.area_key, b.created_at,
  (u.email_confirmed_at IS NOT NULL AND NOT coalesce(u.is_anonymous, false)
    AND (u.banned_until IS NULL OR u.banned_until < now()) AND u.deleted_at IS NULL
    AND b.created_at <= now() - make_interval(hours => :'cool_hours'::int)) AS movable,
  (u.created_at <= now() - make_interval(days => :'account_days'::int)
    AND s.created_at <= now() - make_interval(days => :'shop_days'::int)
    AND (SELECT count(DISTINCT r.product_id) FROM spendless.price_reports r
         WHERE r.store_id = b.store_id AND r.user_id = b.user_id AND r.status = 'accepted'
           AND r.source <> 'dispute' AND r.price IS NOT NULL
           AND r.observed_at > now() - make_interval(days => :'window_days'::int)) >= :'min_products'::int) AS priced
FROM spendless.branch_suggestions b
JOIN spendless.catalog_stores s ON s.id = b.store_id
JOIN auth.users u ON u.id = b.user_id
JOIN spendless.regions g ON g.id = b.region_id AND g.status = 'live'
WHERE b.status = 'open'
  AND s.owner_id = b.user_id AND s.kind = 'physical' AND s.status = 'active' AND s.region_id = b.region_id;

-- Shared in-store shops, keyed the same way ("<chain> · <area>").
CREATE TEMP TABLE shared ON COMMIT DROP AS
SELECT s.id, s.region_id, s.status, s.name, s.created_at,
  spendless.place_key(s.chain) AS chain_key,
  spendless.place_key(substr(s.name, char_length(s.chain) + 4)) AS area_key
FROM spendless.catalog_stores s
WHERE s.owner_id IS NULL AND s.kind = 'physical' AND s.chain IS NOT NULL
  AND left(s.name, char_length(s.chain) + 3) = s.chain || ' · ';

-- ── One decision per shop (city, chain, area) ────────────────────────────────
-- attach: already shared · decline: that shared shop was closed · create: enough
-- people · wait: not yet. New shops per run are capped; the oldest groups go first.
CREATE TEMP TABLE grp ON COMMIT DROP AS
SELECT c.region_id, c.chain_key, c.area_key,
  count(DISTINCT c.user_id) FILTER (WHERE c.movable AND c.priced) AS people,
  -- The most common spelling; capitalised wins a tie.
  mode() WITHIN GROUP (ORDER BY c.chain COLLATE "C") AS chain,
  mode() WITHIN GROUP (ORDER BY c.area COLLATE "C") AS area,
  min(c.created_at) AS first_at,
  (SELECT x.id FROM shared x
   WHERE x.region_id = c.region_id AND x.chain_key = c.chain_key AND x.area_key = c.area_key AND x.status = 'active'
   ORDER BY x.created_at LIMIT 1) AS active_id,
  EXISTS (SELECT 1 FROM shared x
          WHERE x.region_id = c.region_id AND x.chain_key = c.chain_key AND x.area_key = c.area_key AND x.status <> 'active') AS closed_match,
  NULL::text AS action,
  NULL::uuid AS target
FROM cand c
GROUP BY c.region_id, c.chain_key, c.area_key;

UPDATE grp SET action = 'attach', target = active_id WHERE active_id IS NOT NULL;
UPDATE grp SET action = 'decline' WHERE action IS NULL AND closed_match;
UPDATE grp SET action = 'create',
  target = md5('spendless-branch-store:' || region_id || ':' || chain_key || ':' || area_key)::uuid
FROM (
  SELECT g2.region_id AS r, g2.chain_key AS ck, g2.area_key AS ak
  FROM grp g2
  WHERE g2.action IS NULL AND g2.people >= :'min_people'::int
  ORDER BY g2.first_at
  LIMIT :'max_new'::int
) pick
WHERE grp.region_id = pick.r AND grp.chain_key = pick.ck AND grp.area_key = pick.ak;
SELECT count(*) AS n FROM grp WHERE action IS NULL AND people >= :'min_people'::int \gset capped_
UPDATE grp SET action = 'wait' WHERE action IS NULL;

-- ── New shared shops ─────────────────────────────────────────────────────────
WITH made AS (
  INSERT INTO spendless.catalog_stores (id, owner_id, region_id, chain, name, kind, city, delivery_rule, status)
  SELECT g.target, NULL, g.region_id, g.chain, g.chain || ' · ' || g.area, 'physical', r.name, '{"type":"none"}'::jsonb, 'active'
  FROM grp g JOIN spendless.regions r ON r.id = g.region_id
  WHERE g.action = 'create'
  ON CONFLICT (id) DO NOTHING
  RETURNING 1
)
SELECT count(*) AS n FROM made \gset created_

-- Every target must be a shared, open, in-store shop in the same city.
DO $$
DECLARE bad integer;
BEGIN
  SELECT count(*) INTO bad
  FROM pg_temp.grp g
  LEFT JOIN spendless.catalog_stores s ON s.id = g.target
  WHERE g.target IS NOT NULL
    AND (s.id IS NULL OR s.owner_id IS NOT NULL OR s.kind <> 'physical' OR s.status <> 'active' OR s.region_id <> g.region_id);
  IF bad > 0 THEN
    RAISE EXCEPTION '% target shop(s) are not shared, open, in-store shops in their city', bad;
  END IF;
END $$;

-- ── Who moves ────────────────────────────────────────────────────────────────
CREATE TEMP TABLE mv ON COMMIT DROP AS
SELECT c.id AS suggestion_id, c.user_id, c.store_id AS private_id, g.target
FROM cand c
JOIN grp g ON g.region_id = c.region_id AND g.chain_key = c.chain_key AND g.area_key = c.area_key
WHERE g.target IS NOT NULL AND c.movable;

-- Their prices: the latest accepted report per product from the last window_days, one
-- per person even with two copies of the same shop. Not if they already have one as
-- new at the shared shop.
CREATE TEMP TABLE cp ON COMMIT DROP AS
SELECT DISTINCT ON (m.target, r.user_id, r.product_id)
  m.target, r.user_id, r.product_id, r.price, r.currency, r.is_available, r.observed_at, r.source, r.created_at,
  'accepted'::text AS status
FROM mv m
JOIN spendless.price_reports r ON r.store_id = m.private_id AND r.user_id = m.user_id
JOIN spendless.catalog_products p ON p.id = r.product_id AND p.status = 'active'
WHERE r.status = 'accepted' AND r.source IN ('manual', 'trip', 'confirm', 'receipt')
  AND r.observed_at > now() - make_interval(days => :'window_days'::int)
ORDER BY m.target, r.user_id, r.product_id, r.observed_at DESC, r.created_at DESC;

DELETE FROM cp
WHERE EXISTS (
  SELECT 1 FROM spendless.price_reports x
  WHERE x.store_id = cp.target AND x.user_id = cp.user_id AND x.product_id = cp.product_id
    AND x.observed_at >= cp.observed_at
);

-- Held (pending) when more than 40% from the shared shop's current price, or, with no
-- current price, from the middle of what two or more people paid.
UPDATE cp SET status = 'pending'
FROM (
  SELECT k.target, k.product_id,
    coalesce(
      (SELECT c.price FROM spendless.current_prices c
       WHERE c.store_id = k.target AND c.product_id = k.product_id AND c.n_reports > 0 AND c.price > 0),
      CASE WHEN k.people >= 2 THEN k.mid END
    ) AS ref
  FROM (
    SELECT target, product_id, count(DISTINCT user_id) AS people,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY price) AS mid
    FROM cp WHERE price IS NOT NULL
    GROUP BY target, product_id
  ) k
) refs
WHERE cp.target = refs.target AND cp.product_id = refs.product_id
  AND cp.price IS NOT NULL AND refs.ref > 0 AND abs(cp.price - refs.ref) / refs.ref > 0.4;

-- Copies are new rows (never moved), so current prices refresh for both shops. Their
-- created_at is at least 25 hours back, so they never count toward today's limit.
WITH ins AS (
  INSERT INTO spendless.price_reports
    (id, user_id, store_id, product_id, price, currency, is_available, observed_at, source, status, created_at)
  SELECT md5('spendless-branch:' || cp.target || ':' || cp.user_id || ':' || cp.product_id)::uuid,
    cp.user_id, cp.target, cp.product_id, cp.price, cp.currency, cp.is_available, cp.observed_at, cp.source, cp.status,
    least(cp.created_at, now() - interval '25 hours')
  FROM cp
  ON CONFLICT (id) DO NOTHING
  RETURNING status
)
SELECT count(*) AS n, count(*) FILTER (WHERE status = 'pending') AS held FROM ins \gset copied_

-- My stores: the shared shop replaces the private one, only where it was picked
-- (no picks = the app's default set, which counts shops moved into).
WITH added AS (
  INSERT INTO spendless.user_stores (user_id, store_id)
  SELECT DISTINCT m.user_id, m.target
  FROM mv m
  WHERE EXISTS (SELECT 1 FROM spendless.user_stores u WHERE u.user_id = m.user_id AND u.store_id = m.private_id)
  ON CONFLICT DO NOTHING
  RETURNING 1
)
SELECT count(*) AS n FROM added \gset picks_
DELETE FROM spendless.user_stores u USING mv m WHERE u.user_id = m.user_id AND u.store_id = m.private_id;

-- The private copy closes (kept, with its history); the suggestion is done.
UPDATE spendless.catalog_stores s SET status = 'closed'
FROM mv m WHERE s.id = m.private_id AND s.owner_id = m.user_id;
UPDATE spendless.branch_suggestions b SET status = 'promoted', promoted_store_id = m.target, decided_at = now()
FROM mv m WHERE b.id = m.suggestion_id;

WITH d AS (
  UPDATE spendless.branch_suggestions b SET status = 'declined', decided_at = now()
  FROM cand c JOIN grp g ON g.region_id = c.region_id AND g.chain_key = c.chain_key AND g.area_key = c.area_key
  WHERE b.id = c.id AND g.action = 'decline'
  RETURNING 1
)
SELECT count(*) AS n FROM d \gset declined_

-- ── Every run: planned list items still on a moved shop (an offline device can write
-- the old shop back) follow it to the shared one. Their updated_at moves, so devices
-- pull the change.
WITH fixed AS (
  UPDATE spendless.list_items i SET plan_store_id = b.promoted_store_id
  FROM spendless.branch_suggestions b
  JOIN spendless.catalog_stores t ON t.id = b.promoted_store_id AND t.status = 'active'
  WHERE b.status = 'promoted' AND b.store_id IS NOT NULL
    AND i.user_id = b.user_id AND i.plan_store_id = b.store_id AND i.deleted_at IS NULL
  RETURNING 1
)
SELECT count(*) AS n FROM fixed \gset plan_items_

SELECT json_build_object(
  'open', (SELECT count(*) FROM cand),
  'groups', (SELECT count(*) FROM grp),
  'waiting', (SELECT count(*) FROM grp WHERE action = 'wait'),
  'capped', :'capped_n'::int,
  'attached', (SELECT count(*) FROM grp WHERE action = 'attach' AND EXISTS (SELECT 1 FROM mv WHERE mv.target = grp.target)),
  'created', :'created_n'::int,
  'declined', :'declined_n'::int,
  'moved', (SELECT count(*) FROM mv),
  'prices_copied', :'copied_n'::int,
  'prices_held', :'copied_held'::int,
  'picks_swapped', :'picks_n'::int,
  'plan_items', :'plan_items_n'::int,
  'removed', :'gone_n'::int,
  'new_shops', (SELECT coalesce(json_agg(g.chain || ' · ' || g.area ORDER BY g.first_at), '[]'::json) FROM grp g WHERE g.action = 'create')
);

\if :commit
COMMIT;
\else
ROLLBACK;
\endif
