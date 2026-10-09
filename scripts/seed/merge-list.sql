-- The review list (Catalog jobs → merge-products, no "merges"): likely duplicates the
-- nightly rule doesn't merge on its own, for the owner to approve. Read only. Prints one
-- JSON line: [{ kind, from_id, into_id, from_name, into_name, from_stores, into_stores,
-- from_price, into_price, ratio, clash }], at most 200. Variable: max_ratio.
--   name: the exact same name and size, but prices further apart than max_ratio (or one
--         without a price);
--   key:  the same match key, at different stores, not joined by the importer (it
--         keeps a product apart when its price is unlike the others, or the pack
--         differs: clash = one name says pouch or refill, the other jar, bottle or tin).
-- `into` is the product with the most store listings, then the oldest. Pairs whose
-- merge was undone are left out.
\set ON_ERROR_STOP on

WITH prod AS (
  SELECT p.id, p.name, p.created_at, p.match_key, p.size_value, p.size_unit, p.pack_count,
    lower(regexp_replace(btrim(p.name), '\s+', ' ', 'g')) AS nm
  FROM spendless.catalog_products p
  WHERE p.owner_id IS NULL AND p.status = 'active' AND p.name ~ '[[:alpha:]]{3}'
), dup AS (
  SELECT unnest(array_agg(id)) AS id FROM prod
  GROUP BY nm, coalesce(size_value, 0), coalesce(size_unit, ''), pack_count HAVING count(*) > 1
  UNION
  SELECT unnest(array_agg(id)) FROM prod WHERE match_key <> '' GROUP BY match_key HAVING count(*) > 1
), facts AS (
  SELECT p.*,
    (SELECT count(*) FROM spendless.store_listings l WHERE l.product_id = p.id AND l.active AND l.included) AS listings,
    (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY c.price) FROM spendless.current_prices c
     WHERE c.product_id = p.id AND c.n_reports > 0 AND c.price > 0) AS med
  FROM prod p JOIN dup d ON d.id = p.id
), by_name AS (
  SELECT 'name'::text AS kind, f.*, first_value(f.id) OVER (
    PARTITION BY f.nm, f.size_value, f.size_unit, f.pack_count ORDER BY f.listings DESC, f.created_at, f.id) AS target
  FROM facts f
), by_key AS (
  SELECT 'key'::text AS kind, f.*, first_value(f.id) OVER (
    PARTITION BY f.match_key ORDER BY f.listings DESC, f.created_at, f.id) AS target
  FROM facts f WHERE f.match_key <> ''
), cand AS (
  SELECT b.kind, b.id AS from_id, b.target AS into_id
  FROM by_name b
  JOIN facts t ON t.id = b.target
  WHERE b.id <> b.target
    AND (b.med IS NULL OR t.med IS NULL OR greatest(b.med, t.med) / least(b.med, t.med) > :'max_ratio'::numeric)
  UNION ALL
  SELECT k.kind, k.id, k.target
  FROM by_key k
  JOIN facts t ON t.id = k.target
  WHERE k.id <> k.target
    AND NOT (k.nm = t.nm AND k.size_value IS NOT DISTINCT FROM t.size_value
             AND k.size_unit IS NOT DISTINCT FROM t.size_unit AND k.pack_count = t.pack_count)
    -- Listed at the same store: that store sells them as two things.
    AND NOT EXISTS (
      SELECT 1 FROM spendless.store_listings a JOIN spendless.store_listings b ON b.store_id = a.store_id
      WHERE a.product_id = k.id AND b.product_id = k.target AND a.active AND b.active
    )
), rows AS (
  SELECT c.kind, c.from_id, c.into_id, f.name AS from_name, t.name AS into_name,
    (SELECT string_agg(DISTINCT s.name, ', ') FROM spendless.store_listings l JOIN spendless.catalog_stores s ON s.id = l.store_id
     WHERE l.product_id = f.id AND l.active) AS from_stores,
    (SELECT string_agg(DISTINCT s.name, ', ') FROM spendless.store_listings l JOIN spendless.catalog_stores s ON s.id = l.store_id
     WHERE l.product_id = t.id AND l.active) AS into_stores,
    round(f.med::numeric, 2) AS from_price, round(t.med::numeric, 2) AS into_price,
    round((greatest(f.med, t.med) / nullif(least(f.med, t.med), 0))::numeric, 2) AS ratio,
    ((f.name ~* '\m(pouch|refill|stand\s*-?\s*up|standing)\M' AND t.name ~* '\m(jar|bottle|btl|tin|can|glass)\M')
      OR (f.name ~* '\m(jar|bottle|btl|tin|can|glass)\M' AND t.name ~* '\m(pouch|refill|stand\s*-?\s*up|standing)\M')) AS clash
  FROM cand c
  JOIN facts f ON f.id = c.from_id
  JOIN facts t ON t.id = c.into_id
  WHERE NOT EXISTS (
    SELECT 1 FROM spendless.product_merges m
    WHERE m.undone_at IS NOT NULL
      AND ((m.from_id = c.from_id AND m.into_id = c.into_id) OR (m.from_id = c.into_id AND m.into_id = c.from_id))
  )
)
SELECT coalesce(jsonb_agg(r ORDER BY r.kind DESC, r.clash, r.ratio NULLS LAST, r.from_name), '[]'::jsonb)
FROM (
  SELECT * FROM (SELECT DISTINCT ON (from_id) * FROM rows ORDER BY from_id, kind DESC) d
  ORDER BY kind DESC, clash, ratio NULLS LAST, from_name
  LIMIT 200
) r;
