-- What scripts/seed/duplicates.ts needs to find merges no one has to check (run by
-- merge-products.ts --auto). Read only. Prints one JSON line:
--   { products: [[id, match_key, name, brand], …]   public products with a key of the
--                                                    current format,
--     moved:    [[from, into, from_name, from_brand, into_name, into_brand], …] }
--                 a product every store listing has left (store_listings.moved_from),
--                 and the product they went to.
\set ON_ERROR_STOP on
SELECT json_build_object(
  'products', coalesce((
    SELECT json_agg(json_build_array(p.id, p.match_key, p.name, p.brand) ORDER BY p.id)
    FROM spendless.catalog_products p
    WHERE p.owner_id IS NULL AND p.status = 'active' AND p.match_key LIKE 'k2|%'
  ), '[]'::json),
  'moved', coalesce((
    SELECT json_agg(json_build_array(m.from_id, m.into_id, f.name, f.brand, t.name, t.brand))
    FROM (
      SELECT DISTINCT l.moved_from AS from_id, l.product_id AS into_id
      FROM spendless.store_listings l
      WHERE l.moved_from IS NOT NULL AND l.product_id IS NOT NULL AND l.active AND l.moved_from <> l.product_id
        AND NOT EXISTS (SELECT 1 FROM spendless.store_listings x WHERE x.product_id = l.moved_from AND x.active)
    ) m
    JOIN spendless.catalog_products f ON f.id = m.from_id AND f.owner_id IS NULL AND f.status = 'active'
    JOIN spendless.catalog_products t ON t.id = m.into_id AND t.owner_id IS NULL AND t.status = 'active'
  ), '[]'::json)
);
