-- Merges the owner approved (Catalog jobs → merge-products, with "merges"), run by
-- scripts/seed/merge-products.ts --pairs. One transaction; COMMIT with commit=on, else
-- ROLLBACK (a dry run with the same counts). The pairs arrive as pairs.json beside this
-- run ([{ "from": uuid, "into": uuid }], validated by the script), read as a quoted
-- literal: no SQL is built from strings.
\set ON_ERROR_STOP on
\set pairs_json `cat pairs.json`
BEGIN;
SELECT pg_advisory_xact_lock(hashtext('spendless-price-import')) \gset lock_

CREATE TEMP TABLE pairs (from_id uuid, into_id uuid, rule text) ON COMMIT DROP;
INSERT INTO pairs
SELECT (e->>'from')::uuid, (e->>'into')::uuid, 'approved'
FROM jsonb_array_elements(:'pairs_json'::jsonb) e;

-- What each pair is, for the log (before merging changes it).
SELECT json_build_object('asked', (
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'from', f.name, 'from_status', f.status, 'into', t.name, 'into_status', t.status) ORDER BY f.name), '[]'::jsonb)
  FROM pairs p
  LEFT JOIN spendless.catalog_products f ON f.id = p.from_id AND f.owner_id IS NULL
  LEFT JOIN spendless.catalog_products t ON t.id = p.into_id AND t.owner_id IS NULL
));

\ir merge-products.sql

\if :commit
COMMIT;
\else
ROLLBACK;
\endif
