/*
  # Remove Product Variants - Flatten into Individual Products

  This migration:
  1. Adds a `prices` column directly to products
  2. Expands each product variant into its own product row
     - New product name = original product name + " " + variant name
     - Prices are migrated from the variant to the new product
  3. Updates shopping_list items to reference the new product IDs (removes variantId)
  4. Drops the old `variants` column
*/

-- Step 1: Add prices column to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS prices jsonb DEFAULT '[]'::jsonb;

-- Step 2: Create a temporary mapping to track old variant -> new product
CREATE TEMP TABLE IF NOT EXISTS _variant_product_map (
  old_product_id uuid,
  variant_id text,
  new_product_id uuid
);

-- Step 3: Expand each variant into a new product row
DO $$
DECLARE
  prod RECORD;
  variant jsonb;
  new_pid uuid;
BEGIN
  FOR prod IN
    SELECT * FROM products WHERE jsonb_array_length(COALESCE(variants, '[]'::jsonb)) > 0
  LOOP
    FOR variant IN SELECT * FROM jsonb_array_elements(prod.variants) LOOP
      new_pid := gen_random_uuid();

      INSERT INTO products (id, user_id, name, category, brand, prices, variants, created_at, updated_at)
      VALUES (
        new_pid,
        prod.user_id,
        prod.name || ' ' || (variant->>'name'),
        prod.category,
        prod.brand,
        COALESCE(variant->'prices', '[]'::jsonb),
        '[]'::jsonb,
        prod.created_at,
        prod.updated_at
      );

      INSERT INTO _variant_product_map (old_product_id, variant_id, new_product_id)
      VALUES (prod.id, variant->>'id', new_pid);
    END LOOP;

    -- Delete the original product (now replaced by expanded variant products)
    DELETE FROM products WHERE id = prod.id;
  END LOOP;
END $$;

-- Step 4: Update shopping_list items — remap productId+variantId to new productId, drop variantId
UPDATE shopping_lists
SET items = (
  SELECT jsonb_agg(
    CASE
      WHEN m.new_product_id IS NOT NULL THEN
        jsonb_build_object(
          'id',       item->>'id',
          'productId', m.new_product_id::text,
          'quantity',  item->'quantity',
          'addedAt',   item->>'addedAt',
          'priority',  item->>'priority'
        )
      ELSE
        (item - 'variantId')
    END
  )
  FROM jsonb_array_elements(items) AS item
  LEFT JOIN _variant_product_map AS m
    ON m.old_product_id = (item->>'productId')::uuid
    AND m.variant_id = item->>'variantId'
)
WHERE jsonb_array_length(COALESCE(items, '[]'::jsonb)) > 0;

-- Step 5: Clean up any remaining variantId fields in shopping lists
UPDATE shopping_lists
SET items = (
  SELECT jsonb_agg(item - 'variantId')
  FROM jsonb_array_elements(items) AS item
)
WHERE items @> '[{"variantId": ""}]'::jsonb
   OR items::text LIKE '%"variantId"%';

-- Step 6: Drop the variants column
ALTER TABLE products DROP COLUMN IF EXISTS variants;
