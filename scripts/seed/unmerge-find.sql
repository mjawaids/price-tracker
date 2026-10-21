-- Automatic merges that later evidence says were wrong (scripts/seed/merge-products.ts
-- --auto runs unmerge.sql for each, before the night's merges). Read only. Prints one
-- JSON line: [{ product_id, reason }], at most 50. Variable: min_people.
-- Only rules no person checked (import, same-key, near-name, reported), merged at least
-- a day ago and not undone. Reasons, in this order:
--   store-lists-both  a store now lists both as separate items under different names
--                     (one listing the merge moved, one it didn't): it sells two things;
--   prices-apart      the listings the merge moved sell for more than 1.6× (or under
--                     1/1.6) what the product's other listings do;
--   people            min_people people (accounts ≥ 7 days old, prices not discounted
--                     by reporter_trust) said they aren't the same product.
\set ON_ERROR_STOP on

WITH m AS (
  SELECT DISTINCT ON (x.from_id) x.id, x.from_id, x.into_id, spendless.canonical_product(x.into_id) AS now_id,
    x.moved, x.merged_at
  FROM spendless.product_merges x
  JOIN spendless.catalog_products p ON p.id = x.from_id AND p.status = 'merged'
  WHERE x.undone_at IS NULL AND x.rule IN ('import', 'same-key', 'near-name', 'reported')
    AND x.merged_at <= now() - interval '1 day'
  ORDER BY x.from_id, x.merged_at DESC, x.id DESC
), moved AS (
  SELECT m.id, (e->>0)::uuid AS store_id, e->>1 AS external_id
  FROM m, jsonb_array_elements(coalesce(m.moved->'listings', '[]'::jsonb)) e
), listing AS (
  -- The product's active listings now, and whether the merge moved each one.
  SELECT m.id, l.store_id, l.external_id, lower(l.source_name) AS nm, l.last_price,
    EXISTS (SELECT 1 FROM moved v WHERE v.id = m.id AND v.store_id = l.store_id AND v.external_id = l.external_id) AS was_moved
  FROM m JOIN spendless.store_listings l ON l.product_id = m.now_id AND l.active AND l.included
), both_at_one AS (
  SELECT DISTINCT a.id FROM listing a JOIN listing b ON b.id = a.id AND b.store_id = a.store_id
  WHERE a.was_moved AND NOT b.was_moved AND a.nm <> b.nm
), apart_prices AS (
  SELECT id FROM (
    SELECT id,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY last_price) FILTER (WHERE was_moved) AS moved_med,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY last_price) FILTER (WHERE NOT was_moved) AS other_med
    FROM listing WHERE last_price > 0 GROUP BY id
  ) s
  WHERE moved_med IS NOT NULL AND other_med IS NOT NULL AND greatest(moved_med, other_med) / least(moved_med, other_med) > 1.6
), said_apart AS (
  SELECT m.id
  FROM m JOIN spendless.duplicate_reports r
    ON r.kind = 'not_same' AND least(r.product_id, r.other_id) = least(m.from_id, m.now_id)
       AND greatest(r.product_id, r.other_id) = greatest(m.from_id, m.now_id)
  JOIN auth.users u ON u.id = r.user_id AND u.created_at <= now() - interval '7 days'
  LEFT JOIN spendless.reporter_trust t ON t.user_id = r.user_id
  WHERE coalesce(t.weight, 1) >= 1
  GROUP BY m.id
  HAVING count(DISTINCT r.user_id) >= :'min_people'::int
)
SELECT coalesce(jsonb_agg(jsonb_build_object('product_id', d.from_id, 'reason', d.reason) ORDER BY d.merged_at), '[]'::jsonb)
FROM (
  SELECT m.from_id, m.merged_at,
    CASE WHEN m.id IN (SELECT id FROM both_at_one) THEN 'store-lists-both'
         WHEN m.id IN (SELECT id FROM apart_prices) THEN 'prices-apart'
         ELSE 'people' END AS reason
  FROM m
  WHERE m.id IN (SELECT id FROM both_at_one UNION SELECT id FROM apart_prices UNION SELECT id FROM said_apart)
  ORDER BY m.merged_at
  LIMIT 50
) d;
