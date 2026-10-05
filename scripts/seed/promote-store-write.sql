-- Write side of scripts/seed/promote-store.ts, run in ONE transaction
-- (psql --single-transaction). Variables: store_id, region, chain.
-- The parsed product fields arrive as JSON in data.json (written by the script
-- next to this run), read into the `data` variable and passed as a quoted literal.
\set data `cat data.json`

-- The store must still be private; remember its owner.
SELECT owner_id AS owner
FROM spendless.catalog_stores
WHERE id = :'store_id' AND owner_id IS NOT NULL \gset

-- 1. The store becomes public, in its city.
UPDATE spendless.catalog_stores
SET owner_id = NULL, region_id = :'region', chain = :'chain'
WHERE id = :'store_id';

-- 2. The owner's products priced at it become public, with structured fields.
UPDATE spendless.catalog_products p
SET owner_id = NULL,
    name = d.name,
    brand = d.brand,
    variant = d.variant,
    item_type = d.item_type,
    category = d.category,
    size_value = d.size_value,
    size_unit = d.size_unit,
    pack_count = d.pack_count
FROM jsonb_to_recordset(:'data'::jsonb) AS d(
  id uuid, name text, brand text, variant text, item_type text, category text,
  size_value numeric, size_unit text, pack_count integer
)
WHERE p.id = d.id
  AND p.owner_id = :'owner'
  AND EXISTS (SELECT 1 FROM spendless.price_reports r WHERE r.product_id = p.id AND r.store_id = :'store_id');

-- 3. Their prices there become an anonymous store import (current prices are
--    rebuilt by the trigger).
UPDATE spendless.price_reports
SET user_id = NULL, source = 'import'
WHERE store_id = :'store_id' AND user_id = :'owner';

SELECT
  (SELECT count(*) FROM spendless.catalog_products p
     WHERE p.owner_id IS NULL
       AND EXISTS (SELECT 1 FROM spendless.price_reports r WHERE r.product_id = p.id AND r.store_id = :'store_id')) AS public_products,
  (SELECT count(*) FROM spendless.current_prices WHERE store_id = :'store_id' AND n_reports > 0) AS current_prices;
