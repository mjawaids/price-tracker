-- Removes the pre-prefix SpendLess buckets `avatars` and `product-images` and
-- their policies, now that the app uses `spendless-avatars` and
-- `spendless-product-images` (migrations/20261003000300_spendless_storage_buckets.sql).
--
-- SQL can't move files between buckets, so if either old bucket holds any file
-- this stops (and rolls back) instead of deleting it: move those files with the
-- Storage API first, then re-run the deploy.
--
-- migration-guard: allow-public drops the legacy SpendLess storage policies, whose names predate the spendless- prefix

DO $$
DECLARE
  leftover bigint;
BEGIN
  SELECT count(*) INTO leftover
  FROM storage.objects
  WHERE bucket_id IN ('avatars', 'product-images');
  IF leftover > 0 THEN
    RAISE EXCEPTION 'Old buckets avatars/product-images still hold % file(s); move them to the spendless-* buckets before dropping.', leftover;
  END IF;
END $$;

DROP POLICY IF EXISTS "avatars: public read" ON storage.objects;
DROP POLICY IF EXISTS "avatars: owner insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars: owner update" ON storage.objects;
DROP POLICY IF EXISTS "avatars: owner delete" ON storage.objects;

DROP POLICY IF EXISTS "product-images: public read" ON storage.objects;
DROP POLICY IF EXISTS "product-images: owner insert" ON storage.objects;
DROP POLICY IF EXISTS "product-images: owner update" ON storage.objects;
DROP POLICY IF EXISTS "product-images: owner delete" ON storage.objects;

-- Supabase blocks DELETE on storage tables unless this is set; LOCAL keeps it
-- to this migration's transaction. The buckets are empty (checked above).
SET LOCAL storage.allow_delete_query = 'true';
DELETE FROM storage.buckets WHERE id IN ('avatars', 'product-images');
