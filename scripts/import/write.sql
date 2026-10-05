-- Write side of scripts/import/run.ts: one store's import, in ONE transaction
-- (psql --single-transaction). The rows arrive as JSON in batch.json next to this
-- run, read into the `batch` variable and passed as a quoted literal. No SQL is
-- built from strings.
--
-- batch = {
--   store:  { id, name, chain, region_id, website, delivery_rule },
--   run:    { source, started_at, status, pages, note },
--   full:   true when this run read the store's whole catalogue (unseen = gone),
--   rows:   [{ external_id, url, source_name, source_category, included, price,
--              available, gone, new_product_id, name, brand, variant, item_type,
--              category, size_value, size_unit, pack_count, match_key }]
-- }
\set batch `cat batch.json`

-- Imports for different stores may run at once; matching new products must not race.
SELECT pg_advisory_xact_lock(hashtext('spendless-price-import'));

CREATE TEMP TABLE b ON COMMIT DROP AS SELECT :'batch'::jsonb AS j;

-- 1. The store: public, in its city. Refuse an id that belongs to a private store.
SELECT EXISTS (
  SELECT 1 FROM spendless.catalog_stores s, b
  WHERE s.id = (b.j->'store'->>'id')::uuid AND s.owner_id IS NOT NULL
) AS private_store \gset
\if :private_store
  DO $$ BEGIN RAISE EXCEPTION 'store id belongs to a private store'; END $$;
\endif

INSERT INTO spendless.catalog_stores (id, owner_id, region_id, chain, name, kind, website, delivery_rule, status)
SELECT (s->>'id')::uuid, NULL, s->>'region_id', s->>'chain', s->>'name', 'online', s->>'website', s->'delivery_rule', 'active'
FROM b, jsonb_extract_path(b.j, 'store') s
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name, chain = EXCLUDED.chain, region_id = EXCLUDED.region_id, website = EXCLUDED.website,
      delivery_rule = EXCLUDED.delivery_rule, status = 'active', updated_at = now()
  WHERE spendless.catalog_stores.owner_id IS NULL;

SELECT (j->'store'->>'id')::uuid AS store_id, (j->>'full')::boolean AS full_run FROM b \gset

-- 2. Incoming rows.
CREATE TEMP TABLE incoming ON COMMIT DROP AS
SELECT r.*, NULL::uuid AS product_id
FROM b, jsonb_to_recordset(b.j->'rows') AS r(
  external_id text, url text, source_name text, source_category text, included boolean,
  price numeric, available boolean, gone boolean, new_product_id uuid,
  name text, brand text, variant text, item_type text, category text,
  size_value numeric, size_unit text, pack_count integer, match_key text
);

-- 3. Which catalogue product each listing is: the one we mapped before, else a
--    public product with the same match key, else a new public product (one per
--    match key in this batch, or one per listing when there's no key).
UPDATE incoming i SET product_id = l.product_id
FROM spendless.store_listings l
WHERE l.store_id = :'store_id' AND l.external_id = i.external_id AND l.product_id IS NOT NULL AND i.included;

UPDATE incoming i SET product_id = m.id
FROM (
  SELECT DISTINCT ON (match_key) match_key, id
  FROM spendless.catalog_products
  WHERE owner_id IS NULL AND status = 'active' AND match_key IS NOT NULL AND match_key <> ''
  ORDER BY match_key, created_at
) m
WHERE i.product_id IS NULL AND i.included AND i.match_key <> '' AND i.match_key = m.match_key
  -- Never two live listings of one store on one product: that key isn't specific enough.
  AND NOT EXISTS (
    SELECT 1 FROM spendless.store_listings l
    WHERE l.store_id = :'store_id' AND l.product_id = m.id AND l.active AND l.external_id <> i.external_id
  );

UPDATE incoming i SET product_id = f.new_id
FROM (
  SELECT DISTINCT ON (k) k, new_product_id AS new_id
  FROM (SELECT coalesce(nullif(match_key, ''), 'x:' || external_id) AS k, new_product_id, external_id
        FROM incoming WHERE product_id IS NULL AND included) x
  ORDER BY k, external_id
) f
WHERE i.product_id IS NULL AND i.included AND coalesce(nullif(i.match_key, ''), 'x:' || i.external_id) = f.k;

INSERT INTO spendless.catalog_products
  (id, owner_id, name, brand, variant, item_type, category, size_value, size_unit, pack_count, match_key)
SELECT DISTINCT ON (product_id) product_id, NULL, name, brand, variant, item_type, category,
  size_value, size_unit, pack_count, match_key
FROM incoming
WHERE included AND product_id = new_product_id
ORDER BY product_id
ON CONFLICT (id) DO NOTHING;

-- 4. Prices. Compare with this store's latest import report for each product:
--    changed (or new) → a new report; unchanged → move its observed_at to now.
--    If two listings map to one product, the cheapest in-stock one speaks for it.
CREATE TEMP TABLE pick ON COMMIT DROP AS
SELECT DISTINCT ON (product_id) product_id, price, available
FROM incoming
WHERE included AND product_id IS NOT NULL AND NOT coalesce(gone, false)
ORDER BY product_id, available DESC, price ASC;

CREATE TEMP TABLE latest ON COMMIT DROP AS
SELECT DISTINCT ON (r.product_id) r.product_id, r.id, r.price, r.is_available
FROM spendless.price_reports r
JOIN pick p ON p.product_id = r.product_id
WHERE r.store_id = :'store_id' AND r.user_id IS NULL AND r.source = 'import'
ORDER BY r.product_id, r.observed_at DESC, r.created_at DESC;

INSERT INTO spendless.price_reports (user_id, store_id, product_id, price, currency, is_available, observed_at, source)
SELECT NULL, :'store_id', p.product_id, p.price, 'PKR', p.available, now(), 'import'
FROM pick p
LEFT JOIN latest l ON l.product_id = p.product_id
WHERE l.id IS NULL OR l.price IS DISTINCT FROM p.price OR l.is_available IS DISTINCT FROM p.available;

UPDATE spendless.price_reports r SET observed_at = now()
FROM latest l JOIN pick p ON p.product_id = l.product_id
WHERE r.id = l.id AND l.price IS NOT DISTINCT FROM p.price AND l.is_available IS NOT DISTINCT FROM p.available;

-- 5. Listings that stop counting: the store no longer has them (page gone, or
--    missing from a full read), or they were imported before and are now left
--    out. Each gets one "out of stock" report so its old price stops being offered.
CREATE TEMP TABLE gone ON COMMIT DROP AS
SELECT l.external_id, l.product_id, l.last_price, false AS dropped
FROM spendless.store_listings l
WHERE l.store_id = :'store_id' AND l.active AND (
  EXISTS (SELECT 1 FROM incoming i WHERE i.external_id = l.external_id AND coalesce(i.gone, false))
  OR (:'full_run'::boolean AND NOT EXISTS (SELECT 1 FROM incoming i WHERE i.external_id = l.external_id))
);

INSERT INTO gone
SELECT l.external_id, l.product_id, l.last_price, true
FROM spendless.store_listings l
JOIN incoming i ON i.external_id = l.external_id AND NOT coalesce(i.gone, false) AND i.included IS FALSE
WHERE l.store_id = :'store_id' AND l.active AND l.included;

INSERT INTO spendless.price_reports (user_id, store_id, product_id, price, currency, is_available, observed_at, source)
SELECT DISTINCT ON (g.product_id) NULL, :'store_id', g.product_id, g.last_price, 'PKR', false, now(), 'import'
FROM gone g
WHERE g.product_id IS NOT NULL AND g.last_price IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM pick p WHERE p.product_id = g.product_id)
ORDER BY g.product_id;

UPDATE spendless.store_listings l SET active = false, last_checked_at = now()
FROM gone g WHERE l.store_id = :'store_id' AND l.external_id = g.external_id AND NOT g.dropped;

-- A gone marker for a listing that was already gone: just note that we looked.
UPDATE spendless.store_listings l SET last_checked_at = now()
FROM incoming i
WHERE l.store_id = :'store_id' AND l.external_id = i.external_id AND coalesce(i.gone, false) AND NOT l.active;

-- 6. Listings: remember what we saw (gone markers carry no listing data).
INSERT INTO spendless.store_listings AS sl
  (store_id, external_id, product_id, url, source_name, source_category, included, last_price, last_available,
   active, first_seen_at, last_seen_at, last_checked_at)
SELECT :'store_id', external_id, product_id, url, source_name, source_category, included, price, available,
  true, now(), now(), now()
FROM incoming
WHERE NOT coalesce(gone, false)
ON CONFLICT (store_id, external_id) DO UPDATE SET
  product_id = coalesce(sl.product_id, EXCLUDED.product_id),
  url = coalesce(EXCLUDED.url, sl.url),
  source_name = EXCLUDED.source_name,
  source_category = EXCLUDED.source_category,
  included = EXCLUDED.included,
  last_price = coalesce(EXCLUDED.last_price, sl.last_price),
  last_available = EXCLUDED.last_available,
  active = true,
  last_seen_at = now(),
  last_checked_at = now();

-- 7. The run, and a summary for the log.
WITH counts AS (
  SELECT
    (SELECT count(*) FROM incoming WHERE NOT coalesce(gone, false)) AS listings,
    (SELECT count(*) FROM pick p LEFT JOIN latest l ON l.product_id = p.product_id
       WHERE l.id IS NULL OR l.price IS DISTINCT FROM p.price OR l.is_available IS DISTINCT FROM p.available) AS changed,
    (SELECT count(*) FROM pick p JOIN latest l ON l.product_id = p.product_id
       WHERE l.price IS NOT DISTINCT FROM p.price AND l.is_available IS NOT DISTINCT FROM p.available) AS unchanged,
    (SELECT count(DISTINCT product_id) FROM incoming WHERE included AND product_id = new_product_id) AS new_products,
    (SELECT count(*) FROM incoming WHERE included IS FALSE) AS excluded,
    (SELECT count(*) FROM gone WHERE NOT dropped) AS gone
), ins AS (
  INSERT INTO spendless.import_runs (source, started_at, status, pages, listings, changed, unchanged, new_products, excluded, gone, note)
  SELECT b.j->'run'->>'source', (b.j->'run'->>'started_at')::timestamptz, b.j->'run'->>'status',
    (b.j->'run'->>'pages')::integer, c.listings, c.changed, c.unchanged, c.new_products, c.excluded, c.gone,
    nullif(b.j->'run'->>'note', '')
  FROM b, counts c
  RETURNING listings, changed, unchanged, new_products, excluded, gone
)
SELECT row_to_json(ins) FROM ins;
