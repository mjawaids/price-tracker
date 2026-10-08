-- Your contributions: the signed-in user's price reports counted in one call, for the
-- "Your contributions" screen and the card on Contribute.
--
-- Each report is counted once, in the first that fits:
--   disputes      "this price is wrong" reports (source 'dispute')
--   out_of_stock  "not there" reports (no price, or not available)
--   private       at the user's own stores (only they see those prices)
--   held          pending: far from the usual price, waiting for someone else to agree
--   shared        accepted, at a shared store
--   other         anything else (a rejected report, a store no longer visible)
-- so the parts add up to `total`. `month` counts reports added since p_month_start (the
-- user's local start of the month, sent by the app); `shops` the different stores.
--
-- SECURITY INVOKER: it reads as the signed-in user, so RLS limits it to their own
-- reports and the stores they can see. Called as rpc('my_contributions', …) from
-- src/lib/compare/api.ts.

CREATE OR REPLACE FUNCTION spendless.my_contributions(p_month_start timestamptz)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH mine AS (
    SELECT r.store_id, r.created_at,
      CASE
        WHEN r.source = 'dispute' THEN 'disputes'
        WHEN r.price IS NULL OR NOT r.is_available THEN 'out_of_stock'
        WHEN s.owner_id IS NOT NULL THEN 'private'
        WHEN r.status = 'pending' THEN 'held'
        WHEN r.status = 'accepted' AND s.id IS NOT NULL THEN 'shared'
        ELSE 'other'
      END AS kind
    FROM spendless.price_reports r
    LEFT JOIN spendless.catalog_stores s ON s.id = r.store_id
    WHERE r.user_id = auth.uid()
  )
  SELECT jsonb_build_object(
    'total', count(*),
    'month', count(*) FILTER (WHERE created_at >= coalesce(p_month_start, date_trunc('month', now()))),
    'shops', count(DISTINCT store_id),
    'shared', count(*) FILTER (WHERE kind = 'shared'),
    'held', count(*) FILTER (WHERE kind = 'held'),
    'private', count(*) FILTER (WHERE kind = 'private'),
    'out_of_stock', count(*) FILTER (WHERE kind = 'out_of_stock'),
    'disputes', count(*) FILTER (WHERE kind = 'disputes'),
    'other', count(*) FILTER (WHERE kind = 'other')
  )
  FROM mine;
$$;

REVOKE ALL ON FUNCTION spendless.my_contributions(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION spendless.my_contributions(timestamptz) TO authenticated, service_role;
