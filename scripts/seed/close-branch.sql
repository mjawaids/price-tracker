-- Undo a shared shop: the SQL side of scripts/seed/close-branch.ts. One transaction;
-- COMMIT with commit=on, else ROLLBACK (a dry run with the same counts).
-- Variables: store_id (validated by the script), commit.
--
-- Closes the shared in-store shop and gives everyone who moved into it their own shop
-- back: the private copy reopens, My stores and planned list items point at it again,
-- and their suggestions are declined, so the nightly job never makes the shop again.
-- Prices copied to the shared shop stay with it (a closed shop isn't shown).
\set ON_ERROR_STOP on
BEGIN;
-- Never at the same time as the nightly job.
SELECT pg_advisory_xact_lock(hashtextextended('spendless.promote_suggestions', 0)) \gset lock_
SELECT set_config('spendless.close_store', :'store_id', true) \gset cfg_

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM spendless.catalog_stores s
    WHERE s.id = current_setting('spendless.close_store')::uuid AND s.owner_id IS NULL AND s.kind = 'physical'
  ) THEN
    RAISE EXCEPTION 'Not a shared in-store shop';
  END IF;
END $$;

CREATE TEMP TABLE back ON COMMIT DROP AS
SELECT b.id AS suggestion_id, b.user_id, b.store_id AS private_id
FROM spendless.branch_suggestions b
WHERE b.status = 'promoted' AND b.promoted_store_id = :'store_id'::uuid
FOR UPDATE OF b;

WITH reopened AS (
  UPDATE spendless.catalog_stores s SET status = 'active'
  FROM back k WHERE s.id = k.private_id AND s.owner_id = k.user_id AND s.status <> 'active'
  RETURNING 1
)
SELECT count(*) AS n FROM reopened \gset reopened_

-- My stores: back to the private copy where the shared shop was picked.
WITH added AS (
  INSERT INTO spendless.user_stores (user_id, store_id)
  SELECT DISTINCT k.user_id, k.private_id
  FROM back k
  WHERE k.private_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM spendless.user_stores u WHERE u.user_id = k.user_id AND u.store_id = :'store_id'::uuid)
  ON CONFLICT DO NOTHING
  RETURNING 1
)
SELECT count(*) AS n FROM added \gset picks_
DELETE FROM spendless.user_stores u USING back k
WHERE u.user_id = k.user_id AND u.store_id = :'store_id'::uuid AND k.private_id IS NOT NULL;

WITH items AS (
  UPDATE spendless.list_items i SET plan_store_id = k.private_id
  FROM back k
  WHERE k.private_id IS NOT NULL AND i.user_id = k.user_id AND i.plan_store_id = :'store_id'::uuid AND i.deleted_at IS NULL
  RETURNING 1
)
SELECT count(*) AS n FROM items \gset items_

-- Declined: everyone who moved in, and anyone still waiting to.
WITH shop AS (
  SELECT s.region_id, spendless.place_key(s.chain) AS chain_key,
    spendless.place_key(substr(s.name, char_length(s.chain) + 4)) AS area_key
  FROM spendless.catalog_stores s
  WHERE s.id = :'store_id'::uuid AND s.chain IS NOT NULL AND left(s.name, char_length(s.chain) + 3) = s.chain || ' · '
), d AS (
  UPDATE spendless.branch_suggestions b SET status = 'declined', decided_at = now()
  WHERE b.id IN (SELECT suggestion_id FROM back)
     OR (b.status = 'open' AND EXISTS (
       SELECT 1 FROM shop WHERE shop.region_id = b.region_id AND shop.chain_key = b.chain_key AND shop.area_key = b.area_key))
  RETURNING 1
)
SELECT count(*) AS n FROM d \gset declined_

UPDATE spendless.catalog_stores SET status = 'closed' WHERE id = :'store_id'::uuid;

SELECT json_build_object(
  'name', (SELECT name FROM spendless.catalog_stores WHERE id = :'store_id'::uuid),
  'moved_back', (SELECT count(*) FROM back),
  'reopened', :'reopened_n'::int,
  'picks', :'picks_n'::int,
  'plan_items', :'items_n'::int,
  'declined', :'declined_n'::int
);

\if :commit
COMMIT;
\else
ROLLBACK;
\endif
