-- Save a receipt in one transaction: the private products its medicines need and all
-- of its price reports. A medicine reuses the user's own product with the same name
-- (spaces and case ignored) instead of making another. Anything refused — the daily
-- limit (54000), a date outside the last 90 days or a store/product the user can't see
-- (42501), a bad value — rolls the whole receipt back, new products included.
--
-- SECURITY INVOKER (the default): the inserts run as the signed-in user, so the RLS
-- policies and the price_reports trigger apply exactly as they do to direct inserts.
-- Called by the app as rpc('save_receipt', …) from src/lib/compare/api.ts.

CREATE OR REPLACE FUNCTION spendless.save_receipt(
  p_store_id uuid,
  p_observed_at timestamptz,
  p_currency text,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  uid uuid := auth.uid();
  n integer;
  item jsonb;
  np jsonb;
  k text;
  pid uuid;
  v_price numeric;
  is_new boolean;
  by_key jsonb := '{}'::jsonb;     -- product key → id (one product per name)
  pairs jsonb := '{}'::jsonb;      -- product id → price (one report per product, last wins)
  item_products jsonb := '[]'::jsonb;
  products jsonb := '[]'::jsonb;
  reports jsonb;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Sign in to save prices' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Items must be a list' USING ERRCODE = '22023';
  END IF;
  n := jsonb_array_length(p_items);
  IF n < 1 OR n > 150 THEN
    RAISE EXCEPTION 'A receipt saves 1 to 150 prices' USING ERRCODE = '22023';
  END IF;

  -- One receipt at a time per user, so two saves can't both create the same product.
  PERFORM pg_advisory_xact_lock(hashtextextended('spendless.save_receipt:' || uid::text, 0));

  FOR item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_price := round((item ->> 'price')::numeric, 2);
    IF v_price IS NULL OR v_price <= 0 THEN
      RAISE EXCEPTION 'Every price must be above zero' USING ERRCODE = '22023';
    END IF;

    np := item -> 'new_product';
    IF jsonb_typeof(np) = 'object' THEN
      k := lower(btrim(regexp_replace(np ->> 'name', '\s+', ' ', 'g')));
      IF k IS NULL OR k = '' THEN
        RAISE EXCEPTION 'A new product needs a name' USING ERRCODE = '22023';
      END IF;
      IF by_key ? k THEN
        pid := (by_key ->> k)::uuid;
      ELSE
        SELECT p.id INTO pid
        FROM spendless.catalog_products p
        WHERE p.owner_id = uid AND p.status = 'active'
          AND lower(btrim(regexp_replace(p.name, '\s+', ' ', 'g'))) = k
        ORDER BY p.created_at
        LIMIT 1;
        is_new := pid IS NULL;
        IF is_new THEN
          INSERT INTO spendless.catalog_products
            (owner_id, name, brand, variant, item_type, category, size_value, size_unit, pack_count)
          VALUES (
            uid,
            left(btrim(regexp_replace(np ->> 'name', '\s+', ' ', 'g')), 160),
            nullif(btrim(np ->> 'brand'), ''),
            nullif(btrim(np ->> 'variant'), ''),
            nullif(np ->> 'item_type', ''),
            nullif(np ->> 'category', ''),
            (np ->> 'size_value')::numeric,
            nullif(np ->> 'size_unit', ''),
            coalesce((np ->> 'pack_count')::integer, 1)
          )
          RETURNING id INTO pid;
        END IF;
        by_key := by_key || jsonb_build_object(k, pid);
        products := products || jsonb_build_array(jsonb_build_object(
          'key', k,
          'id', pid,
          'created', is_new,
          'row', CASE WHEN is_new THEN (SELECT to_jsonb(p) FROM spendless.catalog_products p WHERE p.id = pid) END
        ));
      END IF;
    ELSE
      pid := (item ->> 'product_id')::uuid;
      IF pid IS NULL THEN
        RAISE EXCEPTION 'Each price needs a product' USING ERRCODE = '22023';
      END IF;
    END IF;

    item_products := item_products || jsonb_build_array(pid);
    pairs := pairs || jsonb_build_object(pid::text, v_price);
  END LOOP;

  -- One statement: the per-row checks run for each report, current prices refresh once.
  WITH ins AS (
    INSERT INTO spendless.price_reports
      (user_id, store_id, product_id, price, currency, is_available, observed_at, source)
    SELECT uid, p_store_id, x.key::uuid, (x.value #>> '{}')::numeric, p_currency, true,
           coalesce(p_observed_at, now()), 'receipt'
    FROM jsonb_each(pairs) AS x
    RETURNING id, product_id, status
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object('id', ins.id, 'product_id', ins.product_id, 'status', ins.status)), '[]'::jsonb)
  INTO reports
  FROM ins;

  RETURN jsonb_build_object('reports', reports, 'products', products, 'item_products', item_products);
END;
$$;

-- Signed-in users only (the schema's default privileges would also grant anon).
REVOKE ALL ON FUNCTION spendless.save_receipt(uuid, timestamptz, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION spendless.save_receipt(uuid, timestamptz, text, jsonb) TO authenticated, service_role;
