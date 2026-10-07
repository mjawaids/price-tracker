-- Write side of scripts/seed/add-branches.ts, run in ONE transaction
-- (psql --single-transaction). Variables: region, city.
-- The branches arrive as JSON in data.json (written by the script next to this run).
\set data `cat data.json`

CREATE TEMP TABLE branch_list ON COMMIT DROP AS
SELECT *
FROM jsonb_to_recordset(:'data'::jsonb) AS d(id uuid, chain text, name text, address text, phone text, status text);

SELECT set_config('spendless.branch_region', :'region', true) \gset

-- Never take over a private store, an online store or another city's branch, even if
-- an id collides (the script checks first; this guards against a change in between).
DO $$
DECLARE clash integer;
BEGIN
  SELECT count(*) INTO clash
  FROM spendless.catalog_stores s
  JOIN pg_temp.branch_list d ON d.id = s.id
  WHERE s.owner_id IS NOT NULL OR s.kind <> 'physical' OR s.region_id IS DISTINCT FROM current_setting('spendless.branch_region');
  IF clash > 0 THEN
    RAISE EXCEPTION '% branch id(s) belong to another store', clash;
  END IF;
END $$;

-- New branches are added; listed ones are updated only when something changed.
WITH up AS (
  INSERT INTO spendless.catalog_stores
    (id, owner_id, region_id, chain, name, kind, address, phone, city, delivery_rule, status)
  SELECT d.id, NULL, :'region', d.chain, d.name, 'physical', d.address, d.phone, :'city', '{"type":"none"}'::jsonb, d.status
  FROM pg_temp.branch_list d
  ON CONFLICT (id) DO UPDATE
  SET chain = EXCLUDED.chain,
      name = EXCLUDED.name,
      address = EXCLUDED.address,
      phone = EXCLUDED.phone,
      city = EXCLUDED.city,
      status = EXCLUDED.status
  WHERE spendless.catalog_stores.owner_id IS NULL
    AND spendless.catalog_stores.kind = 'physical'
    AND spendless.catalog_stores.region_id = EXCLUDED.region_id
    AND (spendless.catalog_stores.chain, spendless.catalog_stores.name, spendless.catalog_stores.address,
         spendless.catalog_stores.phone, spendless.catalog_stores.city, spendless.catalog_stores.status)
        IS DISTINCT FROM (EXCLUDED.chain, EXCLUDED.name, EXCLUDED.address, EXCLUDED.phone, EXCLUDED.city, EXCLUDED.status)
  RETURNING (xmax = 0) AS inserted
)
SELECT json_build_object(
  'inserted', count(*) FILTER (WHERE inserted),
  'updated', count(*) FILTER (WHERE NOT inserted)
)
FROM up;
