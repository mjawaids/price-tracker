-- Nightly, after the price import (scripts/seed/merge-products.ts --auto): every merge
-- the rules are sure of, and junk retired. No person reviews these: a pair a rule isn't
-- sure of stays apart, and an automatic merge that later evidence contradicts is undone
-- (unmerge-find.sql, run just before this). One transaction; COMMIT with commit=on,
-- else ROLLBACK (a dry run with the same counts).
-- Variables: commit, max_ratio (prices "close": 1.25), near_ratio (for near names:
-- 1.15), min_people (people who must agree). auto.json beside this run holds the
-- import / same-key / near-name pairs scripts/seed/duplicates.ts found, names checked
-- ([{ "a": uuid, "b": uuid, "rule": … }]), read as a quoted literal: no SQL is built
-- from strings.
--
-- Rules (public, active products only; a pair whose merge was undone is kept apart):
--   same-name  the exact same name (case and spaces aside), size, unit and pack, real
--              words in the name, both priced, medians within max_ratio;
--   import     a product every store listing has left (the importer re-matched them
--              to another product: store_listings.moved_from), the same name words,
--              prices within 3× as the importer itself allows;
--   same-key   the same match key (brand id, type, variant key, size, pack, the name's
--              other numbers) and name words, never listed together at one store, no
--              pack clash, both priced, medians within max_ratio;
--   near-name  as same-key but the names differ by a slip or two ("Kulfa" / "Kulfi"),
--              medians within near_ratio;
--   reported   min_people people (accounts ≥ 7 days old, prices not discounted by
--              reporter_trust) said they're one product; the same size, brand id and
--              type (or one unknown), never listed together, no pack clash, medians
--              within max_ratio (or one unpriced).
-- In each pair the product with the most store listings (then the oldest) stays.
\set ON_ERROR_STOP on
\set auto_json `cat auto.json`
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

-- Pairs kept apart: an undone merge, either way round.
CREATE TEMP TABLE apart ON COMMIT DROP AS
SELECT from_id AS a, into_id AS b FROM spendless.product_merges WHERE undone_at IS NOT NULL
UNION
SELECT into_id, from_id FROM spendless.product_merges WHERE undone_at IS NOT NULL;

CREATE TEMP TABLE pairs (from_id uuid, into_id uuid, rule text) ON COMMIT DROP;

-- ── same-name ────────────────────────────────────────────────────────────────
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

INSERT INTO pairs
SELECT r.id, r.target, 'same-name'
FROM ranked r
JOIN ranked t ON t.id = r.target
WHERE r.id <> r.target AND r.med IS NOT NULL AND t.med IS NOT NULL
  AND greatest(r.med, t.med) / least(r.med, t.med) <= :'max_ratio'::numeric
  AND NOT EXISTS (SELECT 1 FROM apart x WHERE x.a = r.id AND x.b = r.target);

-- ── The other rules: candidate pairs (a, b), then one set of checks ─────────
CREATE TEMP TABLE cand (a uuid, b uuid, rule text) ON COMMIT DROP;

-- import, same-key, near-name: found by scripts/seed/duplicates.ts (names compared there).
INSERT INTO cand
SELECT (e->>'a')::uuid, (e->>'b')::uuid, e->>'rule'
FROM jsonb_array_elements(:'auto_json'::jsonb) e
WHERE e->>'rule' IN ('import', 'same-key', 'near-name');

-- reported: pairs enough qualifying people called one product.
INSERT INTO cand
SELECT d.lo, d.hi, 'reported'
FROM (
  SELECT least(r.product_id, r.other_id) AS lo, greatest(r.product_id, r.other_id) AS hi, r.user_id
  FROM spendless.duplicate_reports r
  JOIN auth.users u ON u.id = r.user_id AND u.created_at <= now() - interval '7 days'
  LEFT JOIN spendless.reporter_trust t ON t.user_id = r.user_id
  WHERE r.kind = 'same' AND coalesce(t.weight, 1) >= 1
) d
GROUP BY d.lo, d.hi
HAVING count(DISTINCT d.user_id) >= :'min_people'::int;

DELETE FROM cand WHERE a = b OR a IS NULL OR b IS NULL;

-- What each candidate's products are.
CREATE TEMP TABLE facts ON COMMIT DROP AS
SELECT p.id, p.name, p.created_at, p.item_type, p.size_unit,
  p.size_value * p.pack_count AS total,
  nullif(regexp_replace(lower(coalesce(p.brand, '')), '[^a-z0-9&]', '', 'g'), '') AS brand_id,
  (SELECT count(*) FROM spendless.store_listings x WHERE x.product_id = p.id AND x.active AND x.included) AS listings,
  (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY c.price) FROM spendless.current_prices c
   WHERE c.product_id = p.id AND c.n_reports > 0 AND c.price > 0) AS med
FROM spendless.catalog_products p
WHERE p.owner_id IS NULL AND p.status = 'active'
  AND p.id IN (SELECT a FROM cand UNION SELECT b FROM cand);

INSERT INTO pairs
SELECT CASE WHEN keep_a THEN c.b ELSE c.a END, CASE WHEN keep_a THEN c.a ELSE c.b END, c.rule
FROM (
  SELECT c.*, fa, fb,
    -- import: the product the listings went to stays; else most listings, then oldest.
    CASE WHEN c.rule = 'import' THEN false
         ELSE (fa.listings, fb.created_at, fb.id) > (fb.listings, fa.created_at, fa.id) END AS keep_a
  FROM cand c
  JOIN facts fa ON fa.id = c.a
  JOIN facts fb ON fb.id = c.b
) c
WHERE NOT EXISTS (SELECT 1 FROM apart x WHERE x.a = c.a AND x.b = c.b)
  -- Prices: close enough for the rule.
  AND CASE c.rule
    WHEN 'import' THEN (fa).med IS NULL OR (fb).med IS NULL OR greatest((fa).med, (fb).med) / least((fa).med, (fb).med) <= 3
    WHEN 'near-name' THEN (fa).med IS NOT NULL AND (fb).med IS NOT NULL
      AND greatest((fa).med, (fb).med) / least((fa).med, (fb).med) <= :'near_ratio'::numeric
    WHEN 'same-key' THEN (fa).med IS NOT NULL AND (fb).med IS NOT NULL
      AND greatest((fa).med, (fb).med) / least((fa).med, (fb).med) <= :'max_ratio'::numeric
    ELSE (fa).med IS NULL OR (fb).med IS NULL
      OR greatest((fa).med, (fb).med) / least((fa).med, (fb).med) <= :'max_ratio'::numeric
  END
  -- reported: nothing we can read says they differ.
  AND (c.rule <> 'reported' OR (
    (fa).size_unit IS NOT DISTINCT FROM (fb).size_unit
    AND ((fa).total IS NULL AND (fb).total IS NULL
         OR abs((fa).total - (fb).total) <= 0.02 * greatest((fa).total, (fb).total))
    AND ((fa).brand_id IS NULL OR (fb).brand_id IS NULL OR (fa).brand_id = (fb).brand_id)
    AND ((fa).item_type IS NULL OR (fb).item_type IS NULL OR (fa).item_type = (fb).item_type)
  ))
  -- Not the importer's own move: one store sells them as two things.
  AND (c.rule = 'import' OR NOT EXISTS (
    SELECT 1 FROM spendless.store_listings x JOIN spendless.store_listings y ON y.store_id = x.store_id
    WHERE x.product_id = c.a AND y.product_id = c.b AND x.active AND y.active
  ))
  -- A pickle pouch isn't the jar, and pouch milk (fresh) isn't the tetra pack (UHT).
  AND NOT (((fa).name ~* '\m(pouch|refill|stand\s*-?\s*up|standing)\M' AND (fb).name ~* '\m(jar|bottle|btl|tin|can|glass)\M')
        OR ((fa).name ~* '\m(jar|bottle|btl|tin|can|glass)\M' AND (fb).name ~* '\m(pouch|refill|stand\s*-?\s*up|standing)\M')
        OR ((fa).name ~* '\mpouch\M' AND (fb).name ~* '\mtetra\M') OR ((fa).name ~* '\mtetra\M' AND (fb).name ~* '\mpouch\M'))
  -- A product already merging by an earlier rule isn't merged twice.
  AND NOT EXISTS (SELECT 1 FROM pairs p WHERE p.from_id IN (c.a, c.b));

\ir merge-products.sql

SELECT json_build_object(
  'retired', (SELECT count(*) FROM junk),
  'by_rule', coalesce((SELECT json_object_agg(rule, n) FROM (SELECT rule, count(*) AS n FROM pairs GROUP BY rule) r), '{}'::json)
);

\if :commit
COMMIT;
\else
ROLLBACK;
\endif
