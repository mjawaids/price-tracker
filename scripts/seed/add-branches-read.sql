-- Read side of scripts/seed/add-branches.ts. Variables: region.
-- The list's ids arrive as JSON in data.json (written by the script next to this run).
-- One JSON document: the city, its public stores, and any store that already uses
-- one of the list's ids but isn't a public branch in this city (the script refuses those).
\set data `cat data.json`
SELECT json_build_object(
  'region', (
    SELECT row_to_json(r) FROM (SELECT id, name FROM spendless.regions WHERE id = :'region') r
  ),
  'stores', (
    SELECT coalesce(json_agg(row_to_json(s) ORDER BY s.name), '[]'::json)
    FROM (
      SELECT id, name, chain, kind, address, phone, status
      FROM spendless.catalog_stores
      WHERE owner_id IS NULL AND region_id = :'region'
    ) s
  ),
  'taken', (
    SELECT coalesce(json_agg(row_to_json(t)), '[]'::json)
    FROM (
      SELECT s.id, s.kind, s.owner_id IS NOT NULL AS private, s.region_id
      FROM spendless.catalog_stores s
      JOIN jsonb_to_recordset(:'data'::jsonb) AS d(id uuid) ON d.id = s.id
      WHERE s.owner_id IS NOT NULL OR s.kind <> 'physical' OR s.region_id IS DISTINCT FROM :'region'
    ) t
  )
);
