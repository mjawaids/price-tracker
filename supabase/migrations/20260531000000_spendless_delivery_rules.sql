/*
  # SpendLess revamp: delivery rules + product unit

  1. Changes
    - Add `delivery_rule` (jsonb) to `stores` — the delivery model that feeds
      the cart optimizer. Shape:
        {"type":"none"} | {"type":"free"}
        | {"type":"flat","fee":<number>}
        | {"type":"over","threshold":<number>,"fee":<number>}
    - Add `unit` (text) to `products` — how the product is sold (e.g. "1 gal",
      "dozen", "500 g"), shown next to prices.

  2. Backfill (stores.delivery_rule from legacy has_delivery / delivery_fee)
    - has_delivery = false                        -> {"type":"none"}
    - has_delivery = true  AND delivery_fee > 0   -> {"type":"flat","fee":...}
    - has_delivery = true  AND (fee null or 0)    -> {"type":"free"}

  3. Notes
    - Idempotent: safe to run multiple times.
    - Legacy columns (has_delivery, delivery_fee) are retained for compatibility.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'delivery_rule'
  ) THEN
    ALTER TABLE stores ADD COLUMN delivery_rule jsonb DEFAULT NULL;

    -- Backfill from existing fields
    UPDATE stores
      SET delivery_rule = jsonb_build_object('type', 'none')
      WHERE COALESCE(has_delivery, false) = false;

    UPDATE stores
      SET delivery_rule = jsonb_build_object('type', 'flat', 'fee', delivery_fee)
      WHERE COALESCE(has_delivery, false) = true
        AND delivery_fee IS NOT NULL
        AND delivery_fee > 0;

    UPDATE stores
      SET delivery_rule = jsonb_build_object('type', 'free')
      WHERE COALESCE(has_delivery, false) = true
        AND (delivery_fee IS NULL OR delivery_fee = 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'unit'
  ) THEN
    ALTER TABLE products ADD COLUMN unit text DEFAULT '';
  END IF;
END $$;
