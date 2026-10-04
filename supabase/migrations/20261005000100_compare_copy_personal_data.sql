/*
  # Compare v2: copy everyone's existing stores, products and prices into the new catalogue

  Every row stays PRIVATE to the user who made it (owner_id = user_id) and keeps
  its id, so nothing changes for anyone: the same stores, products and prices,
  now readable by the new app. Making any of it public is a separate, explicit
  step (scripts/seed/promote-store.ts), never part of a migration.

  1. `stores` → `catalog_stores` (private). The region is set when the store's
     city matches a region name. Old coordinates are dropped (they were all
     placeholders), and so are websites that aren't http(s) URLs.
     `delivery_rule` falls back to the legacy has_delivery / delivery_fee columns.
  2. `products` → `catalog_products` (private). Brand, unit and image carry over;
     structured size and item type are filled in later by the app.
  3. Every `products.prices[]` entry → one `price_reports` row (source 'manual',
     dated by its `lastUpdated`, and so is `created_at`, so the copy doesn't count
     toward the user's daily report limit). Ids are derived from (product, entry position)
     so re-running inserts nothing twice.
  4. `list_items.product_id` now references `catalog_products` (no row uses it
     yet; ids are preserved anyway).

  The old tables are left untouched for the app version still live during the
  deploy; a later post-deploy migration drops them.

  Idempotent: safe to run more than once.
*/

-- 1. Stores
INSERT INTO spendless.catalog_stores
  (id, owner_id, region_id, name, kind, address, city, delivery_rule, website, phone, created_at)
SELECT
  s.id,
  s.user_id,
  (SELECT r.id FROM spendless.regions r WHERE lower(r.name) = lower(btrim(s.location->>'city'))),
  left(coalesce(nullif(btrim(s.name), ''), 'Store'), 80),
  CASE WHEN s.type = 'physical' THEN 'physical' ELSE 'online' END,
  left(nullif(btrim(s.location->>'address'), ''), 200),
  left(nullif(btrim(s.location->>'city'), ''), 60),
  CASE
    WHEN jsonb_typeof(s.delivery_rule) = 'object'
      AND (
        s.delivery_rule->>'type' IN ('none', 'free')
        OR (s.delivery_rule->>'type' = 'flat'
            AND jsonb_typeof(s.delivery_rule->'fee') = 'number' AND s.delivery_rule->'fee' >= '0'::jsonb)
        OR (s.delivery_rule->>'type' = 'over'
            AND jsonb_typeof(s.delivery_rule->'fee') = 'number' AND s.delivery_rule->'fee' >= '0'::jsonb
            AND jsonb_typeof(s.delivery_rule->'threshold') = 'number' AND s.delivery_rule->'threshold' >= '0'::jsonb)
      )
      THEN s.delivery_rule - 'minOrder'
    WHEN NOT coalesce(s.has_delivery, false) THEN '{"type":"none"}'::jsonb
    WHEN coalesce(s.delivery_fee, 0) > 0 THEN jsonb_build_object('type', 'flat', 'fee', s.delivery_fee)
    ELSE '{"type":"free"}'::jsonb
  END,
  CASE WHEN s.website ~* '^https?://[^[:space:]]+$' AND char_length(s.website) <= 300 THEN s.website END,
  left(nullif(btrim(s.phone), ''), 40),
  coalesce(s.created_at, now())
FROM spendless.stores s
ON CONFLICT (id) DO NOTHING;

-- 2. Products
INSERT INTO spendless.catalog_products
  (id, owner_id, name, brand, category, unit_label, image_url, created_at)
SELECT
  p.id,
  p.user_id,
  left(coalesce(nullif(btrim(p.name), ''), 'Product'), 160),
  left(nullif(btrim(p.brand), ''), 60),
  left(nullif(btrim(p.category), ''), 60),
  left(nullif(btrim(p.unit), ''), 40),
  CASE WHEN p.image_url ~* '^https://[^[:space:]]+$' AND char_length(p.image_url) <= 500 THEN p.image_url END,
  coalesce(p.created_at, now())
FROM spendless.products p
ON CONFLICT (id) DO NOTHING;

-- 3. Prices → reports (only for stores of the same user that were copied above).
-- One statement, so the current-price trigger runs once for all of them.
INSERT INTO spendless.price_reports
  (id, user_id, store_id, product_id, price, currency, is_available, observed_at, source, status, created_at)
SELECT
  md5('spendless-copy:' || p.id::text || ':' || e.ord::text)::uuid,
  p.user_id,
  v.store_id,
  p.id,
  round(v.price, 2),
  CASE WHEN upper(e.value->>'currency') ~ '^[A-Z]{3}$' THEN upper(e.value->>'currency') END,
  coalesce(e.value->>'isAvailable', 'true') <> 'false',
  coalesce(v.observed_at, now()),
  'manual',
  'accepted',
  -- Dated like the original price, so the copy doesn't count toward today's report limit.
  least(coalesce(v.observed_at, now()), now())
FROM spendless.products p
CROSS JOIN LATERAL jsonb_array_elements(
  CASE WHEN jsonb_typeof(p.prices) = 'array' THEN p.prices ELSE '[]'::jsonb END
) WITH ORDINALITY AS e(value, ord)
-- CASE guarantees the check runs before the cast (AND doesn't).
CROSS JOIN LATERAL (
  SELECT
    CASE WHEN e.value->>'storeId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN (e.value->>'storeId')::uuid END AS store_id,
    CASE WHEN jsonb_typeof(e.value->'price') = 'number' THEN (e.value->>'price')::numeric END AS price,
    CASE WHEN e.value->>'lastUpdated' ~ '^\d{4}-\d{2}-\d{2}([T ][0-9:.]+)?(Z|[+-]\d{2}(:?\d{2})?)?$'
      THEN (e.value->>'lastUpdated')::timestamptz END AS observed_at
) v
WHERE v.price > 0
  AND v.price < 10000000
  AND EXISTS (
    SELECT 1 FROM spendless.catalog_stores cs
    WHERE cs.id = v.store_id AND cs.owner_id = p.user_id
  )
ON CONFLICT (id) DO NOTHING;

-- 4. Pinned product on a list item → the new catalogue.
UPDATE spendless.list_items li
SET product_id = NULL
WHERE li.product_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM spendless.catalog_products cp WHERE cp.id = li.product_id);

ALTER TABLE spendless.list_items DROP CONSTRAINT IF EXISTS list_items_product_id_fkey;
ALTER TABLE spendless.list_items
  ADD CONSTRAINT list_items_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES spendless.catalog_products(id) ON DELETE SET NULL;
