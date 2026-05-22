/*
  # Remove Product Variants - Flatten into Individual Products

  This migration:
  1. Adds a `prices` column directly to products
  2. Expands each product variant into its own product row
     - New product name = TRIM(original product name + " " + variant name)
     - Variants with a blank name are skipped
     - Prices are migrated from the variant to the new product
  3. Updates shopping_list items to reference the new product IDs (removes variantId)
  4. Removes shopping list items whose productId no longer exists
  5. Drops the old `variants` column

  Supabase wraps each migration file in a transaction automatically,
  so no explicit BEGIN/COMMIT is needed here.
*/

-- Step 1: Add prices column to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS prices jsonb DEFAULT '[]'::jsonb;

-- Step 2: Create a temporary mapping to track old variant -> new product
CREATE TEMP TABLE IF NOT EXISTS _variant_product_map (
  old_product_id uuid,
  variant_id     text,
  new_product_id uuid
);

-- Step 3: Expand each variant into a new product row.
--   Guard: checks whether the variants column still exists before running,
--   so re-executing this migration on an already-migrated database is safe.
DO $$
DECLARE
  prod         RECORD;
  variant      jsonb;
  new_pid      uuid;
  variant_name text;
BEGIN
  -- Idempotency guard: skip if variants column is already gone
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'variants'
  ) THEN
    RAISE NOTICE 'variants column not found — expansion already applied, skipping.';
    RETURN;
  END IF;

  FOR prod IN
    SELECT * FROM products
    WHERE jsonb_array_length(COALESCE(variants, '[]'::jsonb)) > 0
  LOOP
    FOR variant IN SELECT * FROM jsonb_array_elements(prod.variants) LOOP
      variant_name := TRIM(COALESCE(variant->>'name', ''));

      -- Skip blank variant names to avoid producing "Product Name " as a product
      IF variant_name = '' THEN
        CONTINUE;
      END IF;

      new_pid := gen_random_uuid();

      INSERT INTO products (id, user_id, name, category, brand, prices, variants, created_at, updated_at)
      VALUES (
        new_pid,
        prod.user_id,
        TRIM(prod.name || ' ' || variant_name),
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

    -- Delete the original parent product (replaced by its expanded variant rows)
    DELETE FROM products WHERE id = prod.id;
  END LOOP;
END $$;

-- Step 4: Remap shopping list items to new product IDs, dropping variantId in one pass.
--   Items whose (productId, variantId) pair matched a mapping get the new productId.
--   Items with no mapping (e.g. pointed at a product that had no variants) just have
--   variantId stripped.
UPDATE shopping_lists
SET items = (
  SELECT jsonb_agg(
    CASE
      WHEN m.new_product_id IS NOT NULL THEN
        jsonb_build_object(
          'id',        item->>'id',
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
   AND m.variant_id     =  item->>'variantId'
)
WHERE jsonb_array_length(COALESCE(items, '[]'::jsonb)) > 0;

-- Step 5: Remove shopping list items that reference products which no longer exist.
--   This catches items whose parent product was deleted during expansion but whose
--   variantId produced no match in the mapping table (edge case: corrupt data,
--   variant id mismatch, etc.).
UPDATE shopping_lists
SET items = (
  SELECT COALESCE(jsonb_agg(item), '[]'::jsonb)
  FROM jsonb_array_elements(items) AS item
  WHERE EXISTS (
    SELECT 1 FROM products p
    WHERE p.id = (item->>'productId')::uuid
  )
)
WHERE jsonb_array_length(COALESCE(items, '[]'::jsonb)) > 0;

-- Step 6: Drop the variants column
ALTER TABLE products DROP COLUMN IF EXISTS variants;