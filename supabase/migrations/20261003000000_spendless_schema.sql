/*
  # Move SpendLess into its own schema: `spendless`

  The Supabase project is shared with other apps, so SpendLess keeps all of its
  tables, functions and triggers in the `spendless` schema instead of `public`.

  1. Schema + grants (per Supabase "Using Custom Schemas"). The schema must also be
     listed under Dashboard → Settings → API → Exposed schemas.
  2. SpendLess's own `updated_at` trigger function (the one in `public` may be used
     by other apps, so it is left alone).
  3. Move `products`, `stores`, `shopping_lists` from `public` to `spendless`.
     ALTER TABLE … SET SCHEMA moves the data, indexes, constraints, RLS policies
     and triggers with the table.
  4. TEMPORARY pass-through views in `public` so an app build that still queries
     `public` keeps working during the rollout. `security_invoker` makes the
     caller's RLS apply. Dropped by 20261003000200_drop_public_compat_views.sql
     once the new build (which queries `spendless`) is deployed.

  Idempotent: safe to run more than once.
*/

CREATE SCHEMA IF NOT EXISTS spendless;

GRANT USAGE ON SCHEMA spendless TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA spendless GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA spendless GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA spendless GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION spendless.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Move the tables (only if they are still in public and not yet moved).
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['products', 'stores', 'shopping_lists'] LOOP
    IF EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = t AND c.relkind = 'r'
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'spendless' AND c.relname = t
    ) THEN
      EXECUTE format('ALTER TABLE public.%I SET SCHEMA spendless', t);
    END IF;
  END LOOP;
END $$;

-- Point the updated_at triggers at SpendLess's own function.
DROP TRIGGER IF EXISTS update_products_updated_at ON spendless.products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON spendless.products
  FOR EACH ROW EXECUTE FUNCTION spendless.update_updated_at_column();

DROP TRIGGER IF EXISTS update_shopping_lists_updated_at ON spendless.shopping_lists;
CREATE TRIGGER update_shopping_lists_updated_at
  BEFORE UPDATE ON spendless.shopping_lists
  FOR EACH ROW EXECUTE FUNCTION spendless.update_updated_at_column();

GRANT ALL ON ALL TABLES IN SCHEMA spendless TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA spendless TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA spendless TO anon, authenticated, service_role;

-- TEMPORARY rollout views (see header). Only created where nothing else
-- already uses the name in public.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['products', 'stores', 'shopping_lists'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = t
    ) THEN
      EXECUTE format(
        'CREATE VIEW public.%I WITH (security_invoker = true) AS SELECT * FROM spendless.%I', t, t
      );
      EXECUTE format(
        'COMMENT ON VIEW public.%I IS %L', t,
        'TEMPORARY SpendLess rollout view → spendless.' || t || '. Drop after the spendless-schema build is deployed.'
      );
      EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated, service_role', t);
    END IF;
  END LOOP;
END $$;
