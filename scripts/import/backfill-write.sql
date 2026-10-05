-- Store the match keys computed by run.ts ('' = not confident). Rows come from
-- backfill.json next to this run; only public rows without a key are touched.
\set data `cat backfill.json`
UPDATE spendless.catalog_products p
SET match_key = x.match_key
FROM jsonb_to_recordset(:'data'::jsonb) AS x(id uuid, match_key text)
WHERE p.id = x.id AND p.owner_id IS NULL AND p.match_key IS NULL;
SELECT count(*) FROM spendless.catalog_products WHERE owner_id IS NULL AND match_key IS NULL;
