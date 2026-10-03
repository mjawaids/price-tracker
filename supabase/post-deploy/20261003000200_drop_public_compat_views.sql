/*
  # Drop the temporary SpendLess rollout views from `public`

  Lives in supabase/post-deploy: the pipeline runs it only AFTER the build that
  queries the `spendless` schema is deployed
  (src/lib/supabaseClient.ts → db.schema = 'spendless'). After this, SpendLess
  has nothing left in `public`.

  Only drops views whose comment marks them as SpendLess rollout views, so a
  table or view another app owns with the same name is never touched.
*/
-- migration-guard: allow-public removes SpendLess's own temporary rollout views

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['products', 'stores', 'shopping_lists'] LOOP
    IF EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = t AND c.relkind = 'v'
        AND obj_description(c.oid, 'pg_class') LIKE 'TEMPORARY SpendLess rollout view%'
    ) THEN
      EXECUTE format('DROP VIEW public.%I', t);
    END IF;
  END LOOP;
END $$;
