-- Public products whose match key run.ts works out before the stores run (no listing
-- gives them one): ones with no key yet, and ones sold at a public store we don't
-- import (the promoted Panda Mart rows). Their keys then follow the current name
-- parser, the same as imported listings' keys. Also the catalogue's brands, which the
-- parser is given as it is for imported listings.
SELECT json_build_object(
  'rows', coalesce((
    SELECT json_agg(row_to_json(p))
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
    ) p
  ), '[]'::json),
  -- The same brands read.sql gives the importer.
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
