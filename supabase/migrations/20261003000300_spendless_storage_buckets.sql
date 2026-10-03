-- SpendLess storage buckets, renamed with the `spendless-` prefix: buckets are
-- project-wide in the shared Supabase project. They replace `avatars` and
-- `product-images`, which post-deploy/20261003000400_drop_legacy_storage_buckets.sql
-- removes once the new app is live. (Both old buckets were empty, so no files move.)
--
-- Public buckets: files are served by their public URL, which bypasses RLS.
-- The policies below cover everything else: a signed-in user may only read,
-- upload, replace and delete files inside their own `<user id>/` folder, so
-- nobody can list or touch other users' files. Images only, up to 10 MB.
--
-- `postgres` may manage policies on storage.objects through supautils.policy_grants.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('spendless-avatars', 'spendless-avatars', true, 10485760, ARRAY['image/*']),
  ('spendless-product-images', 'spendless-product-images', true, 10485760, ARRAY['image/*'])
ON CONFLICT (id) DO NOTHING;

-- spendless-avatars ---------------------------------------------------------
DROP POLICY IF EXISTS "spendless-avatars: owner read" ON storage.objects;
CREATE POLICY "spendless-avatars: owner read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'spendless-avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS "spendless-avatars: owner insert" ON storage.objects;
CREATE POLICY "spendless-avatars: owner insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'spendless-avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS "spendless-avatars: owner update" ON storage.objects;
CREATE POLICY "spendless-avatars: owner update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'spendless-avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text)
  WITH CHECK (bucket_id = 'spendless-avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS "spendless-avatars: owner delete" ON storage.objects;
CREATE POLICY "spendless-avatars: owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'spendless-avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

-- spendless-product-images --------------------------------------------------
DROP POLICY IF EXISTS "spendless-product-images: owner read" ON storage.objects;
CREATE POLICY "spendless-product-images: owner read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'spendless-product-images' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS "spendless-product-images: owner insert" ON storage.objects;
CREATE POLICY "spendless-product-images: owner insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'spendless-product-images' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS "spendless-product-images: owner update" ON storage.objects;
CREATE POLICY "spendless-product-images: owner update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'spendless-product-images' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text)
  WITH CHECK (bucket_id = 'spendless-product-images' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS "spendless-product-images: owner delete" ON storage.objects;
CREATE POLICY "spendless-product-images: owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'spendless-product-images' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
