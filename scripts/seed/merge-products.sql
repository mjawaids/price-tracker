-- Merge public products: the shared step of scripts/seed/merge-products.ts, included
-- (\ir) by merge-auto.sql and merge-pairs.sql inside their transaction, after they've
-- filled the temp table
--   pairs(from_id uuid, into_id uuid, rule text)   -- from_id becomes into_id
-- Prints one JSON line of counts (the caller adds its own).
--
-- Merging `from` into `into`:
--   1. products merged into `from` before now point at `into`;
--   2. the store listings on `from` move to `into` (the importer prices them there);
--   3. per store and person, `from`'s latest accepted report is copied onto `into`
--      (copy_of = the original) unless `into` has one as new there; people's copies
--      more than 40% from `into`'s current price there are held, as theirs would be;
--   4. one out-of-stock import report on `from` where it had an import price, so apps
--      see the change in their next sync, not just at their daily full refresh;
--   5. everyone's list items (pinned and planned) and usuals move to `into`;
--   6. `from` is marked merged, and product_merges records what moved (for undo).
-- Copies are new rows, never moved ones: price_reports stays append-only.

-- Pairs that no longer make sense go: `into` is where its own merges lead, both are
-- public, `from` is still active, and no product is both merged and merged into.
UPDATE pairs SET into_id = spendless.canonical_product(into_id);
DELETE FROM pairs p
WHERE p.from_id = p.into_id
   OR NOT EXISTS (SELECT 1 FROM spendless.catalog_products f WHERE f.id = p.from_id AND f.owner_id IS NULL AND f.status = 'active')
   OR NOT EXISTS (SELECT 1 FROM spendless.catalog_products t WHERE t.id = p.into_id AND t.owner_id IS NULL AND t.status = 'active');
DELETE FROM pairs WHERE ctid IN (
  SELECT ctid FROM (SELECT ctid, row_number() OVER (PARTITION BY from_id ORDER BY into_id) AS n FROM pairs) d WHERE d.n > 1
);
-- A chain inside one run (a → b, b → c) becomes a → c, b → c; a cycle is dropped.
UPDATE pairs a SET into_id = b.into_id FROM pairs b WHERE a.into_id = b.from_id;
UPDATE pairs a SET into_id = b.into_id FROM pairs b WHERE a.into_id = b.from_id;
DELETE FROM pairs a WHERE a.from_id = a.into_id OR EXISTS (SELECT 1 FROM pairs b WHERE b.from_id = a.into_id);

-- 1. Earlier merges into `from`.
CREATE TEMP TABLE m_chained ON COMMIT DROP AS
SELECT p.from_id, c.id
FROM pairs p JOIN spendless.catalog_products c ON c.merged_into = p.from_id;
UPDATE spendless.catalog_products c SET merged_into = p.into_id
FROM pairs p WHERE c.merged_into = p.from_id;

-- 2. Listings.
CREATE TEMP TABLE m_listings ON COMMIT DROP AS
SELECT p.from_id, l.store_id, l.external_id
FROM pairs p JOIN spendless.store_listings l ON l.product_id = p.from_id;
UPDATE spendless.store_listings l SET product_id = p.into_id
FROM pairs p WHERE l.product_id = p.from_id;

-- 3. Prices: the latest accepted report per store and reporter (the import is one
--    reporter), unless `into` has that reporter's report there as new or newer.
CREATE TEMP TABLE m_copy ON COMMIT DROP AS
SELECT DISTINCT ON (p.from_id, r.store_id, r.user_id)
  p.from_id, p.into_id, r.id AS original, r.user_id, r.store_id, r.price, r.currency, r.is_available,
  r.observed_at, r.source, r.created_at, 'accepted'::text AS status
FROM pairs p
JOIN spendless.price_reports r ON r.product_id = p.from_id
WHERE r.status = 'accepted' AND r.source <> 'dispute' AND r.copy_of IS NULL
ORDER BY p.from_id, r.store_id, r.user_id, r.observed_at DESC, r.created_at DESC;

DELETE FROM m_copy c
WHERE EXISTS (
  SELECT 1 FROM spendless.price_reports x
  WHERE x.product_id = c.into_id AND x.store_id = c.store_id AND x.user_id IS NOT DISTINCT FROM c.user_id
    AND x.observed_at >= c.observed_at
);

UPDATE m_copy c SET status = 'pending'
FROM spendless.current_prices cp
JOIN spendless.catalog_stores s ON s.id = cp.store_id AND s.owner_id IS NULL
WHERE c.user_id IS NOT NULL AND c.price IS NOT NULL
  AND cp.store_id = c.store_id AND cp.product_id = c.into_id AND cp.n_reports > 0 AND cp.price > 0
  AND abs(c.price - cp.price) / cp.price > 0.4;

-- Fixed ids, so a re-run never copies twice; created_at at least 25 hours back, so a
-- copy never counts toward its reporter's daily limit.
CREATE TEMP TABLE m_copied (from_id uuid, id uuid) ON COMMIT DROP;
WITH ins AS (
  INSERT INTO spendless.price_reports
    (id, user_id, store_id, product_id, price, currency, is_available, observed_at, source, status, created_at, copy_of)
  SELECT md5('spendless-merge:' || c.into_id || ':' || c.original)::uuid,
    c.user_id, c.store_id, c.into_id, c.price, c.currency, c.is_available, c.observed_at, c.source, c.status,
    least(c.created_at, now() - interval '25 hours'), c.original
  FROM m_copy c
  ON CONFLICT (id) DO NOTHING
  RETURNING id, copy_of
)
INSERT INTO m_copied SELECT c.from_id, ins.id FROM ins JOIN m_copy c ON c.original = ins.copy_of;

-- 4. Out of stock on `from` where its import still shows it in stock.
WITH last_import AS (
  SELECT DISTINCT ON (r.product_id, r.store_id) r.product_id, r.store_id, r.price, r.currency, r.is_available
  FROM pairs p JOIN spendless.price_reports r ON r.product_id = p.from_id
  WHERE r.user_id IS NULL AND r.source = 'import'
  ORDER BY r.product_id, r.store_id, r.observed_at DESC, r.created_at DESC
), ins AS (
  INSERT INTO spendless.price_reports (user_id, store_id, product_id, price, currency, is_available, observed_at, source)
  SELECT NULL, li.store_id, li.product_id, li.price, li.currency, false, now(), 'import'
  FROM last_import li WHERE li.is_available
  RETURNING 1
)
SELECT count(*) AS n FROM ins \gset m_marked_

-- 5. List items and usuals, everyone's (not deleted items).
CREATE TEMP TABLE m_items ON COMMIT DROP AS
SELECT p.from_id, i.id, (i.product_id = p.from_id) AS pinned, (i.plan_product_id = p.from_id) AS planned
FROM pairs p JOIN spendless.list_items i ON (i.product_id = p.from_id OR i.plan_product_id = p.from_id)
WHERE i.deleted_at IS NULL;
UPDATE spendless.list_items i
SET product_id = CASE WHEN m.pinned THEN p.into_id ELSE i.product_id END,
    plan_product_id = CASE WHEN m.planned THEN p.into_id ELSE i.plan_product_id END
FROM m_items m JOIN pairs p ON p.from_id = m.from_id
WHERE i.id = m.id;

CREATE TEMP TABLE m_prefs ON COMMIT DROP AS
SELECT p.from_id, f.id, f.ref_product_id AS ref_before, f.product_ids AS ids_before
FROM pairs p JOIN spendless.item_preferences f ON (f.ref_product_id = p.from_id OR p.from_id = ANY (f.product_ids));
-- The follow-merges trigger keeps the list in order and drops the duplicate when both
-- products were in it.
UPDATE spendless.item_preferences f
SET ref_product_id = CASE WHEN f.ref_product_id = p.from_id THEN p.into_id ELSE f.ref_product_id END,
    product_ids = array_replace(f.product_ids, p.from_id, p.into_id)
FROM m_prefs m JOIN pairs p ON p.from_id = m.from_id
WHERE f.id = m.id;

-- 6. Mark merged, and log.
CREATE TEMP TABLE m_keys ON COMMIT DROP AS
SELECT f.id AS from_id, f.match_key FROM pairs p JOIN spendless.catalog_products f ON f.id = p.from_id;
UPDATE spendless.catalog_products f SET status = 'merged', merged_into = p.into_id, match_key = ''
FROM pairs p WHERE f.id = p.from_id;

INSERT INTO spendless.product_merges (from_id, into_id, rule, moved)
SELECT p.from_id, p.into_id, p.rule, jsonb_build_object(
  'match_key', (SELECT k.match_key FROM m_keys k WHERE k.from_id = p.from_id),
  'chained', coalesce((SELECT jsonb_agg(c.id) FROM m_chained c WHERE c.from_id = p.from_id), '[]'::jsonb),
  'listings', coalesce((SELECT jsonb_agg(jsonb_build_array(l.store_id, l.external_id)) FROM m_listings l WHERE l.from_id = p.from_id), '[]'::jsonb),
  'copies', coalesce((SELECT jsonb_agg(c.id) FROM m_copied c WHERE c.from_id = p.from_id), '[]'::jsonb),
  'items', coalesce((SELECT jsonb_agg(jsonb_build_object('id', i.id, 'pinned', i.pinned, 'planned', i.planned)) FROM m_items i WHERE i.from_id = p.from_id), '[]'::jsonb),
  'prefs', coalesce((SELECT jsonb_agg(jsonb_build_object('id', f.id, 'ref', f.ref_before, 'ids', to_jsonb(f.ids_before))) FROM m_prefs f WHERE f.from_id = p.from_id), '[]'::jsonb)
)
FROM pairs p;

SELECT json_build_object(
  'merged', (SELECT count(*) FROM pairs),
  'listings', (SELECT count(*) FROM m_listings),
  'copies', (SELECT count(*) FROM m_copied),
  'marked', :'m_marked_n'::int,
  'items', (SELECT count(*) FROM m_items),
  'preferences', (SELECT count(*) FROM m_prefs)
);
