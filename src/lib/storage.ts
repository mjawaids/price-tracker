// Supabase Storage buckets used by SpendLess. Buckets are project-wide in the
// shared Supabase project, so ours are prefixed `spendless-` (see CLAUDE.md).
// Both are public: files are read through their public URL, and each user may
// only write inside their own `<userId>/` folder.
export const AVATARS_BUCKET = 'spendless-avatars'
export const PRODUCT_IMAGES_BUCKET = 'spendless-product-images'

// Public URLs look like …/storage/v1/object/public/<bucket>/<path>.
// Returns the object path inside `bucket`, or null when the URL points
// somewhere else (e.g. a Google profile photo).
export const storagePathFromUrl = (url: string | undefined, bucket: string): string | null => {
  if (!url) return null
  const marker = `/${bucket}/`
  const idx = url.indexOf(marker)
  return idx === -1 ? null : url.slice(idx + marker.length)
}
