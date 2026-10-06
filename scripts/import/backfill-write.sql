-- Store what run.ts read from those products' names ('' key = not confident). Rows
-- come from backfill.json next to this run. Only public rows are touched, and only
-- when something changed (an update makes every client re-sync the product).
\set data `cat backfill.json`
WITH x AS (
  SELECT * FROM jsonb_to_recordset(:'data'::jsonb)
    AS x(id uuid, variant text, size_value numeric, size_unit text, pack_count integer, match_key text)
), upd AS (
  UPDATE spendless.catalog_products p
  SET variant = x.variant, size_value = x.size_value, size_unit = x.size_unit, pack_count = x.pack_count,
      match_key = x.match_key
  FROM x
  WHERE p.id = x.id AND p.owner_id IS NULL
    AND (p.variant, p.size_value, p.size_unit, p.pack_count, p.match_key)
        IS DISTINCT FROM (x.variant, x.size_value, x.size_unit, x.pack_count, x.match_key)
  RETURNING 1
)
SELECT json_build_object('updated', (SELECT count(*) FROM upd), 'keyed', (SELECT count(*) FROM x WHERE x.match_key <> ''));
