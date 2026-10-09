-- Nightly, after the price import (scripts/seed/merge-products.ts --auto): the safe
-- merges, and junk retired. One transaction; COMMIT with commit=on, else ROLLBACK (a
-- dry run with the same counts). Variables: commit, max_ratio (prices "close": 1.25).
--
-- Safe = public, active products with the exact same name (case and spaces aside) and
-- the same size, unit and pack, with real words in the name, both priced, and their
-- median prices within max_ratio of each other. In each such group the product with the
-- most store listings (then the oldest) stays; the others merge into it. A pair whose
-- merge was undone is kept apart. Anything less certain goes to the review list
-- (merge-list.sql) for the owner to approve.
\set ON_ERROR_STOP on
BEGIN;
-- Never while the importer writes (same lock as scripts/import/write.sql).
SELECT pg_advisory_xact_lock(hashtext('spendless-price-import')) \gset lock_

-- Junk: a name a store's system filled in ("#N/A", "null", "-"), never a product. The
-- importer leaves such listings out (placeholderName in scripts/import/normalize.ts).
CREATE TEMP TABLE junk ON COMMIT DROP AS
SELECT p.id FROM spendless.catalog_products p
WHERE p.owner_id IS NULL AND p.status = 'active'
  AND (p.name !~ '[[:alpha:]].*[[:alpha:]]'
       OR p.name ~* '^\s*#?\s*(n\s*/\s*a|na|nil|null|none|undefined|unknown)\s*$');

-- Out of stock where its import still shows it, so apps drop it in their next sync.
WITH last_import AS (
  SELECT DISTINCT ON (r.product_id, r.store_id) r.product_id, r.store_id, r.price, r.currency, r.is_available
  FROM junk j JOIN spendless.price_reports r ON r.product_id = j.id
  WHERE r.user_id IS NULL AND r.source = 'import'
  ORDER BY r.product_id, r.store_id, r.observed_at DESC, r.created_at DESC
)
INSERT INTO spendless.price_reports (user_id, store_id, product_id, price, currency, is_available, observed_at, source)
SELECT NULL, li.store_id, li.product_id, li.price, li.currency, false, now(), 'import'
FROM last_import li WHERE li.is_available;

UPDATE spendless.catalog_products p SET status = 'retired', match_key = ''
FROM junk j WHERE p.id = j.id;

-- Same-name groups.
CREATE TEMP TABLE named ON COMMIT DROP AS
SELECT p.id, p.created_at, lower(regexp_replace(btrim(p.name), '\s+', ' ', 'g')) AS nm,
  p.size_value, p.size_unit, p.pack_count
FROM spendless.catalog_products p
WHERE p.owner_id IS NULL AND p.status = 'active' AND p.name ~ '[[:alpha:]]{3}';

DELETE FROM named WHERE id NOT IN (
  SELECT unnest(array_agg(id)) FROM named
  GROUP BY nm, coalesce(size_value, 0), coalesce(size_unit, ''), pack_count HAVING count(*) > 1
);

CREATE TEMP TABLE ranked ON COMMIT DROP AS
SELECT n.*, coalesce(l.n, 0) AS listings, c.med,
  first_value(n.id) OVER w AS target
FROM named n
LEFT JOIN (
  SELECT x.product_id, count(*) AS n FROM spendless.store_listings x
  WHERE x.active AND x.included AND x.product_id IN (SELECT id FROM named)
  GROUP BY x.product_id
) l ON l.product_id = n.id
LEFT JOIN (
  SELECT cp.product_id, percentile_cont(0.5) WITHIN GROUP (ORDER BY cp.price) AS med
  FROM spendless.current_prices cp
  WHERE cp.n_reports > 0 AND cp.price > 0 AND cp.product_id IN (SELECT id FROM named)
  GROUP BY cp.product_id
) c ON c.product_id = n.id
WINDOW w AS (PARTITION BY n.nm, n.size_value, n.size_unit, n.pack_count
             ORDER BY coalesce(l.n, 0) DESC, n.created_at, n.id);

CREATE TEMP TABLE pairs (from_id uuid, into_id uuid, rule text) ON COMMIT DROP;
INSERT INTO pairs
SELECT r.id, r.target, 'same-name'
FROM ranked r
JOIN ranked t ON t.id = r.target
WHERE r.id <> r.target AND r.med IS NOT NULL AND t.med IS NOT NULL
  AND greatest(r.med, t.med) / least(r.med, t.med) <= :'max_ratio'::numeric
  AND NOT EXISTS (
    SELECT 1 FROM spendless.product_merges m
    WHERE m.undone_at IS NOT NULL
      AND ((m.from_id = r.id AND m.into_id = r.target) OR (m.from_id = r.target AND m.into_id = r.id))
  );

\ir merge-products.sql

SELECT json_build_object('retired', (SELECT count(*) FROM junk));

\if :commit
COMMIT;
\else
ROLLBACK;
\endif
