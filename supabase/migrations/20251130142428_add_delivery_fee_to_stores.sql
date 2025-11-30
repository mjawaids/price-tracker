/*
  # Add delivery fee column to stores table

  1. Changes
    - Add `delivery_fee` column to stores table (numeric, nullable)
    - This field stores the delivery fee for the store
    - Only used if `has_delivery` is true

  2. Migration Details
    - New column: `delivery_fee` (numeric, default NULL)
    - Existing stores will have NULL delivery_fee until updated
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'delivery_fee'
  ) THEN
    ALTER TABLE stores ADD COLUMN delivery_fee numeric DEFAULT NULL;
  END IF;
END $$;
