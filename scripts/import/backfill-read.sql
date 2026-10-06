-- Public products whose match key run.ts works out before the stores run (no listing
-- gives them one): ones with no key yet, and ones sold at a public store we don't
-- import (the promoted Panda Mart rows). Their keys then follow the current name
-- parser, the same as imported listings' keys.
SELECT coalesce(json_agg(row_to_json(p)), '[]'::json)
FROM (
  SELECT p.id, p.name, p.brand, p.category, p.variant, p.item_type, p.size_value, p.size_unit, p.pack_count
  FROM spendless.catalog_products p
  WHERE p.owner_id IS NULL AND p.status = 'active' AND (
    p.match_key IS NULL OR EXISTS (
      SELECT 1
      FROM spendless.current_prices c
      JOIN spendless.catalog_stores s ON s.id = c.store_id
      WHERE c.product_id = p.id AND c.n_reports > 0 AND s.owner_id IS NULL
        AND NOT EXISTS (SELECT 1 FROM spendless.store_listings l WHERE l.store_id = s.id)
    )
  )
  ORDER BY p.id
  LIMIT 20000
) p;
