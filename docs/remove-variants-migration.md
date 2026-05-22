# Remove Product Variants — Migration & Deployment Guide

## Overview

This change flattens the product/variant data model. Previously each **Product** contained an array of **Variants**, where each variant held its own per-store prices. That made simple product management unnecessarily complex.

**After this change:**
- Every variant becomes its own top-level product.
- A product's name carries the variant detail directly, e.g. `"Tapal Danedar 900gm"`.
- Prices are stored directly on the product, one per store.
- Shopping list items reference a single `productId` — no more `variantId`.

### Before → After example

| Before | After |
|--------|-------|
| Product: `Tapal Danedar` → Variant: `900gm` | Product: `Tapal Danedar 900gm` |
| Product: `Tapal Danedar` → Variant: `450gm` | Product: `Tapal Danedar 450gm` |

---

## Files changed

| File | What changed |
|------|-------------|
| `supabase/migrations/20260319000000_remove_variants_flatten_products.sql` | Data migration + schema change |
| `src/types/index.ts` | Removed `ProductVariant`; `Product` now has `prices[]`; `ShoppingListItem` drops `variantId` |
| `src/hooks/useSupabaseData.ts` | Reads/writes `prices` field instead of `variants` |
| `src/components/AddProduct.tsx` | Simplified form — no variants section |
| `src/components/EditProduct.tsx` | Simplified modal — no variants section |
| `src/components/ProductList.tsx` | Shows per-store prices directly on each product |
| `src/components/PriceManager.tsx` | Removed variant selection step |
| `src/components/ShoppingList.tsx` | Removed variant selection; items reference product only |
| `src/components/Dashboard.tsx` | Stats now show "X with prices" instead of variant count |

---

## Local developer setup

### Prerequisites

- Node.js 18+
- npm
- Supabase CLI (`npm install -g supabase`)
- A Supabase project (cloud or local)

### 1. Clone and install

```bash
git clone <repo-url>
cd price-tracker
npm install
```

### 2. Configure environment

Create a `.env.local` file in the project root:

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Find these values in your Supabase dashboard under **Project Settings → API**.

### 3. Run the development server

```bash
npm run dev
```

Open `http://localhost:5173`.

### 4. TypeScript check

```bash
npx tsc --noEmit
```

### 5. Lint

```bash
npm run lint
```

---

## Running the migration

> **Important:** The migration is destructive — it deletes original product rows and replaces them with expanded variant rows. **Back up your data first** (see below).

### Option A — Supabase cloud dashboard (recommended for production)

1. Go to your Supabase project → **SQL Editor**.
2. Paste the contents of `supabase/migrations/20260319000000_remove_variants_flatten_products.sql`.
3. Click **Run**.
4. Verify the results (see [Verifying the migration](#verifying-the-migration) below).

### Option B — Supabase CLI (local or linked project)

```bash
# Link to your project if not already done
supabase link --project-ref <your-project-ref>

# Push all pending migrations
supabase db push
```

### Option C — Run migration manually via psql

```bash
psql "$DATABASE_URL" -f supabase/migrations/20260319000000_remove_variants_flatten_products.sql
```

---

## Backing up data before migration

Run these queries in the Supabase SQL Editor to export your current data. Save the results as CSV or JSON before running the migration.

```sql
-- Export products with variants (pre-migration snapshot)
SELECT id, user_id, name, category, brand, variants, created_at
FROM products
ORDER BY created_at;

-- Export shopping lists (pre-migration snapshot)
SELECT id, user_id, name, items, created_at, updated_at
FROM shopping_lists
ORDER BY created_at;
```

---

## Verifying the migration

Run these checks in the Supabase SQL Editor after the migration completes.

### 1. Confirm `variants` column is gone

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;
```

Expected: `id, user_id, name, category, brand, created_at, updated_at, prices` — **no `variants`**.

### 2. Confirm products were expanded correctly

```sql
-- Each row should have prices as a JSON array (may be empty [])
SELECT id, name, prices
FROM products
ORDER BY created_at
LIMIT 20;
```

### 3. Confirm no `variantId` remains in shopping lists

```sql
SELECT id, name, items
FROM shopping_lists
WHERE items::text LIKE '%variantId%';
```

Expected: **0 rows**.

### 4. Check shopping list items reference valid products

```sql
SELECT
  sl.id   AS list_id,
  sl.name AS list_name,
  item->>'productId' AS product_id,
  p.name AS product_name
FROM shopping_lists sl,
  jsonb_array_elements(sl.items) AS item
LEFT JOIN products p ON p.id = (item->>'productId')::uuid
ORDER BY sl.name;
```

All `product_name` values should be non-null. Nulls mean a shopping list item references a product that no longer exists (uncommon edge case — safe to remove those items manually).

---

## Deploying the frontend

### Deploying to Netlify / Vercel / similar

```bash
npm run build
# Deploy the resulting `dist/` directory
```

Make sure environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) are set in your hosting platform's settings.

### Deployment order

Run the **database migration first**, then deploy the **frontend**. The new frontend is not compatible with the old schema (it reads `prices` instead of `variants`).

```
1. Back up data
2. Run migration on Supabase
3. Verify migration
4. Build frontend: npm run build
5. Deploy dist/ to hosting
6. Smoke test (see below)
```

---

## Smoke testing after deployment

Walk through these scenarios after deploying:

### Products

- [ ] Open the **Products** view — all products load without error.
- [ ] Products that previously had variants now appear as separate items with the combined name (e.g. "Tapal Danedar 900gm").
- [ ] Click the expand chevron on a product — per-store prices show correctly.
- [ ] Click **Edit** on a product — modal shows name, category, brand only (no variants section).
- [ ] Click **Delete** on a product — it is removed.
- [ ] Click **Add Product** — form shows name, category, brand only; saving creates the product.

### Price Manager

- [ ] Open **Price Manager** — products load in the dropdown.
- [ ] Select a product — prices for that product are shown (no variant dropdown appears).
- [ ] Click **Add Price** — select a store, enter price, save — price appears in the list.
- [ ] Edit and delete a price entry.

### Shopping Lists

- [ ] Open a shopping list.
- [ ] Click **Add Item** — only a product dropdown appears (no variant dropdown).
- [ ] Select a product and add it — item appears in the list.
- [ ] Verify quantity controls and removal work.
- [ ] Verify the estimated total is calculated correctly using best available prices.

### Dashboard

- [ ] Open the **Dashboard** — stats show correct counts.
- [ ] "Total Products" stat shows "X with prices" (not "X variants").
- [ ] Recent products list shows "X stores" per product.

---

## Rollback plan

There is no automatic rollback since the `variants` column is dropped. If you need to revert:

1. Restore from the pre-migration backup you exported above.
2. Redeploy the previous version of the frontend (the git commit before this branch was merged).

```bash
# Restore products from backup in SQL Editor
-- Recreate variants column
ALTER TABLE products ADD COLUMN variants jsonb DEFAULT '[]'::jsonb;

-- Then manually re-insert your backup data
-- (use the CSV/JSON you exported before running the migration)
```

---

## FAQ

**Q: What happens to products that had no variants (empty `variants: []`)?**
They are left unchanged and now have `prices: []`. They appear in the product list and can have prices added via Price Manager.

**Q: What happens to shopping list items whose product/variant no longer maps cleanly?**
Items are kept but the `variantId` field is stripped. If the original product also had no variants, `productId` is preserved as-is. Items where the old product was deleted (because it was expanded into variants) will have a `productId` pointing to the new expanded product that best matches their old `variantId`. In rare edge cases where no match is found, the item is retained with the old `productId` — run the verification query above to identify and clean up any orphaned items.

**Q: Can I run this migration more than once safely?**
Yes — the migration is guarded with `IF NOT EXISTS` and `IF EXISTS` checks. Re-running it on an already-migrated database is a no-op: the `prices` column already exists, no products have a `variants` column to process, and the `DROP COLUMN IF EXISTS` will silently skip.
