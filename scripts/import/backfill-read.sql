-- Public products that have no match key yet (e.g. the promoted Panda Mart rows).
SELECT coalesce(json_agg(row_to_json(p)), '[]'::json)
FROM (
  SELECT id, name, brand, variant, item_type, size_value, size_unit, pack_count
  FROM spendless.catalog_products
  WHERE owner_id IS NULL AND match_key IS NULL
  LIMIT 20000
) p;
