-- Read side of scripts/import/run.ts. Variables: store_id.
-- One JSON document: what we know about this store's listings (for the rolling
-- refresh) and the brands in the public catalogue (to read product names).
SELECT json_build_object(
  'listings', (
    SELECT coalesce(json_agg(json_build_object(
      'id', l.external_id, 'url', l.url, 'included', l.included, 'active', l.active, 'checked_at', l.last_checked_at,
      'name', l.source_name, 'category', l.source_category
    )), '[]'::json)
    FROM spendless.store_listings l
    WHERE l.store_id = :'store_id'
  ),
  'brands', (
    SELECT coalesce(json_agg(b.brand), '[]'::json)
    FROM (
      SELECT p.brand
      FROM spendless.catalog_products p
      WHERE p.owner_id IS NULL AND p.status = 'active' AND p.brand IS NOT NULL AND char_length(p.brand) BETWEEN 2 AND 40
      GROUP BY p.brand
      HAVING count(*) >= 2
      ORDER BY count(*) DESC
      LIMIT 3000
    ) b
  )
);
