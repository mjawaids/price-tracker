-- Undo a merge (Catalog jobs → unmerge-product), run by scripts/seed/merge-products.ts
-- --undo. One transaction; COMMIT with commit=on, else ROLLBACK (a dry run with the same
-- counts). Variables: product_id (the merged product, validated by the script), commit.
--
-- Uses the product's latest merge in product_merges: the product is active again (with
-- its old match key), and what the merge moved comes back where nothing has changed it
-- since — store listings, list items, usuals, products merged into it before. The
-- prices the merge copied are deleted (people's current prices refresh). The pair is
-- then kept apart: the nightly rule never merges it again.
\set ON_ERROR_STOP on
BEGIN;
SELECT pg_advisory_xact_lock(hashtext('spendless-price-import')) \gset lock_
SELECT set_config('spendless.unmerge_product', :'product_id', true) \gset cfg_

CREATE TEMP TABLE m ON COMMIT DROP AS
SELECT x.id, x.from_id, x.into_id, spendless.canonical_product(x.into_id) AS now_id, x.moved
FROM spendless.product_merges x
JOIN spendless.catalog_products p ON p.id = x.from_id AND p.status = 'merged'
WHERE x.from_id = :'product_id'::uuid AND x.undone_at IS NULL
ORDER BY x.merged_at DESC, x.id DESC
LIMIT 1;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM m) THEN
    RAISE EXCEPTION 'No merge to undo for product %', current_setting('spendless.unmerge_product');
  END IF;
END $$;

-- The product first, so nothing that points back at it is sent on by the triggers.
UPDATE spendless.catalog_products p
SET status = 'active', merged_into = NULL, match_key = coalesce(m.moved->>'match_key', p.match_key)
FROM m WHERE p.id = m.from_id;

WITH back AS (
  UPDATE spendless.catalog_products c SET merged_into = m.from_id
  FROM m WHERE c.id IN (SELECT (jsonb_array_elements_text(m.moved->'chained'))::uuid) AND c.merged_into = m.now_id
  RETURNING 1
)
SELECT count(*) AS n FROM back \gset chained_

WITH back AS (
  UPDATE spendless.store_listings l SET product_id = m.from_id
  FROM m, jsonb_array_elements(m.moved->'listings') e
  WHERE l.store_id = (e->>0)::uuid AND l.external_id = e->>1 AND l.product_id = m.now_id
  RETURNING 1
)
SELECT count(*) AS n FROM back \gset listings_

WITH back AS (
  UPDATE spendless.list_items i
  SET product_id = CASE WHEN (e->>'pinned')::boolean AND i.product_id = m.now_id THEN m.from_id ELSE i.product_id END,
      plan_product_id = CASE WHEN (e->>'planned')::boolean AND i.plan_product_id = m.now_id THEN m.from_id ELSE i.plan_product_id END
  FROM m, jsonb_array_elements(m.moved->'items') e
  WHERE i.id = (e->>'id')::uuid
    AND (((e->>'pinned')::boolean AND i.product_id = m.now_id) OR ((e->>'planned')::boolean AND i.plan_product_id = m.now_id))
  RETURNING 1
)
SELECT count(*) AS n FROM back \gset items_

-- Usuals: back to what they were, unless the person changed them since.
WITH back AS (
  UPDATE spendless.item_preferences f
  SET ref_product_id = nullif(e->>'ref', '')::uuid,
      product_ids = ARRAY(SELECT jsonb_array_elements_text(coalesce(e->'ids', '[]'::jsonb))::uuid)
  FROM m, jsonb_array_elements(m.moved->'prefs') e
  WHERE f.id = (e->>'id')::uuid
    AND (f.ref_product_id = m.now_id OR m.now_id = ANY (f.product_ids))
  RETURNING 1
)
SELECT count(*) AS n FROM back \gset prefs_

WITH gone AS (
  DELETE FROM spendless.price_reports r
  USING m
  WHERE r.id IN (SELECT (jsonb_array_elements_text(m.moved->'copies'))::uuid) AND r.copy_of IS NOT NULL
  RETURNING 1
)
SELECT count(*) AS n FROM gone \gset copies_

UPDATE spendless.product_merges x SET undone_at = now() FROM m WHERE x.id = m.id;

SELECT json_build_object(
  'product', (SELECT p.name FROM spendless.catalog_products p JOIN m ON p.id = m.from_id),
  'was_merged_into', (SELECT p.name FROM spendless.catalog_products p JOIN m ON p.id = m.now_id),
  'listings', :'listings_n'::int,
  'items', :'items_n'::int,
  'preferences', :'prefs_n'::int,
  'chained', :'chained_n'::int,
  'copies_deleted', :'copies_n'::int
);

\if :commit
COMMIT;
\else
ROLLBACK;
\endif
