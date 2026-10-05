-- Read side of scripts/seed/promote-store.ts. Variables: store_id.
-- One JSON document: the store, and the owner's products priced at it.
SELECT json_build_object(
  'store', (
    SELECT row_to_json(s)
    FROM (
      SELECT id, owner_id, name, kind, region_id
      FROM spendless.catalog_stores
      WHERE id = :'store_id'
    ) s
  ),
  'products', (
    SELECT coalesce(json_agg(row_to_json(x)), '[]'::json)
    FROM (
      SELECT p.id, p.name, p.brand, p.category
      FROM spendless.catalog_products p
      JOIN spendless.catalog_stores s ON s.id = :'store_id'
      WHERE p.owner_id = s.owner_id
        AND EXISTS (
          SELECT 1 FROM spendless.price_reports r
          WHERE r.product_id = p.id AND r.store_id = s.id
        )
    ) x
  )
);
