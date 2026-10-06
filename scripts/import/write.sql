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

-- 3. Which catalogue product each listing is.
--    Other stores' prices for a product (the median), to tell a carton of 12 or a
--    twin pack from the single unit that shares its key.
CREATE TEMP TABLE others ON COMMIT DROP AS
SELECT product_id, percentile_cont(0.5) WITHIN GROUP (ORDER BY price) AS median
FROM spendless.current_prices
WHERE store_id <> :'store_id' AND n_reports > 0 AND price > 0
GROUP BY product_id;

--    For each listing: the product it mapped to before (and whether that product is
--    this listing's alone: no other listing, no other store's price), and the
--    oldest other public product with its match key (and whether we may join it:
--    never two live listings of one store on one product).
CREATE TEMP TABLE cand ON COMMIT DROP AS
SELECT i.external_id, i.match_key,
  l.product_id AS prev_id,
  coalesce(p.match_key, '') AS prev_key,
  p.created_at AS prev_created,
  l.product_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM spendless.store_listings x
                    WHERE x.product_id = l.product_id AND NOT (x.store_id = :'store_id' AND x.external_id = i.external_id))
    AND op.product_id IS NULL AS prev_sole,
  op.median IS NULL OR i.price BETWEEN op.median / 3 AND op.median * 3 AS prev_sane,
  q.id AS key_id,
  q.created_at AS key_created,
  q.id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM spendless.store_listings x
    WHERE x.store_id = :'store_id' AND x.product_id = q.id AND x.active AND x.external_id <> i.external_id
  ) AS key_free,
  oq.median IS NULL OR i.price BETWEEN oq.median / 3 AND oq.median * 3 AS key_sane,
  NULL::uuid AS target,
  false AS rekey,
  false AS apart
FROM incoming i
LEFT JOIN spendless.store_listings l ON l.store_id = :'store_id' AND l.external_id = i.external_id AND l.product_id IS NOT NULL
LEFT JOIN spendless.catalog_products p ON p.id = l.product_id
LEFT JOIN others op ON op.product_id = l.product_id
LEFT JOIN LATERAL (
  SELECT m.id, m.created_at FROM spendless.catalog_products m
  WHERE i.match_key <> '' AND m.owner_id IS NULL AND m.status = 'active'
    AND m.match_key IS NOT NULL AND m.match_key <> '' AND m.match_key = i.match_key
    AND m.id IS DISTINCT FROM l.product_id
  ORDER BY m.created_at, m.id
  LIMIT 1
) q ON true
LEFT JOIN others oq ON oq.product_id = q.id
WHERE i.included AND NOT coalesce(i.gone, false);

--    a. The product we mapped before, while it still fits: same key (a blank
--       incoming key says nothing new) and a price in line with the other stores'.
--       If an older product has the same key and we may join it, we move there, so
--       two products that came to share a key end up as one.
UPDATE cand SET target = prev_id
WHERE prev_id IS NOT NULL AND prev_sane AND (
  match_key = ''
  OR (match_key = prev_key AND NOT (key_id IS NOT NULL AND key_free AND key_sane AND key_created < prev_created))
);
--    b. Else the public product with this key, if the price is in line.
UPDATE cand SET target = key_id
WHERE target IS NULL AND key_id IS NOT NULL AND key_free AND key_sane;
--    c. Else a product that is this listing's alone stays, and takes the new key
--       (none when another product already has it).
UPDATE cand SET target = prev_id, rekey = true
WHERE target IS NULL AND prev_id IS NOT NULL AND prev_sole;
--    d. Else a new product; held apart (no key) when it's priced unlike the others with its key.
UPDATE cand SET apart = true
WHERE target IS NULL AND (
  (key_id IS NOT NULL AND key_free AND NOT key_sane) OR (prev_id IS NOT NULL AND match_key = prev_key AND NOT prev_sane)
);

UPDATE incoming i SET product_id = c.target
FROM cand c WHERE c.external_id = i.external_id AND c.target IS NOT NULL;

UPDATE incoming i SET match_key = ''
FROM cand c WHERE c.external_id = i.external_id AND c.apart;

UPDATE incoming i SET product_id = f.new_id
FROM (
  SELECT DISTINCT ON (k) k, new_product_id AS new_id
  FROM (SELECT coalesce(nullif(match_key, ''), 'x:' || external_id) AS k, new_product_id, external_id
        FROM incoming WHERE product_id IS NULL AND included AND NOT coalesce(gone, false)) x
  ORDER BY k, external_id
) f
WHERE i.product_id IS NULL AND i.included AND NOT coalesce(i.gone, false)
  AND coalesce(nullif(i.match_key, ''), 'x:' || i.external_id) = f.k;

INSERT INTO spendless.catalog_products
  (id, owner_id, name, brand, variant, item_type, category, size_value, size_unit, pack_count, match_key)
SELECT DISTINCT ON (product_id) product_id, NULL, name, brand, variant, item_type, category,
  size_value, size_unit, pack_count, match_key
FROM incoming
WHERE included AND product_id = new_product_id
ORDER BY product_id
ON CONFLICT (id) DO NOTHING;

--    A product that is only this listing's follows what we now read from its name.
UPDATE spendless.catalog_products p
SET name = i.name, brand = i.brand, variant = i.variant, item_type = i.item_type, category = i.category,
    size_value = i.size_value, size_unit = i.size_unit, pack_count = i.pack_count,
    match_key = CASE WHEN c.key_id IS NULL THEN i.match_key ELSE '' END
FROM cand c JOIN incoming i ON i.external_id = c.external_id
WHERE c.rekey AND p.id = c.prev_id AND p.owner_id IS NULL
  AND (p.name, p.brand, p.variant, p.item_type, p.category, p.size_value, p.size_unit, p.pack_count, p.match_key)
      IS DISTINCT FROM (i.name, i.brand, i.variant, i.item_type, i.category, i.size_value, i.size_unit, i.pack_count,
                        CASE WHEN c.key_id IS NULL THEN i.match_key ELSE '' END);

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

-- A listing that moved to another product: the old one stops showing this store's price.
INSERT INTO gone
SELECT c.external_id, c.prev_id, l.last_price, true
FROM cand c
JOIN spendless.store_listings l ON l.store_id = :'store_id' AND l.external_id = c.external_id
JOIN incoming i ON i.external_id = c.external_id
WHERE c.prev_id IS NOT NULL AND i.product_id IS DISTINCT FROM c.prev_id;

INSERT INTO spendless.price_reports (user_id, store_id, product_id, price, currency, is_available, observed_at, source)
SELECT DISTINCT ON (g.product_id) NULL, :'store_id', g.product_id, g.last_price, 'PKR', false, now(), 'import'
FROM gone g
WHERE g.product_id IS NOT NULL AND g.last_price IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM pick p WHERE p.product_id = g.product_id)
ORDER BY g.product_id;

UPDATE spendless.store_listings l SET active = false, last_checked_at = now()
FROM gone g WHERE l.store_id = :'store_id' AND l.external_id = g.external_id AND NOT g.dropped;

-- A product every listing has moved away from, with no price in stock anywhere,
-- stops matching: a later listing with its old key gets a product of its own.
UPDATE spendless.catalog_products p SET match_key = ''
FROM cand c JOIN incoming i ON i.external_id = c.external_id
WHERE c.prev_id IS NOT NULL AND i.product_id IS DISTINCT FROM c.prev_id
  AND p.id = c.prev_id AND p.owner_id IS NULL AND p.match_key <> ''
  AND NOT EXISTS (SELECT 1 FROM spendless.store_listings x
                  WHERE x.product_id = p.id AND NOT (x.store_id = :'store_id' AND x.external_id = c.external_id))
  AND NOT EXISTS (SELECT 1 FROM spendless.current_prices cp WHERE cp.product_id = p.id AND cp.n_reports > 0 AND cp.is_available);

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
  product_id = coalesce(EXCLUDED.product_id, sl.product_id),
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
