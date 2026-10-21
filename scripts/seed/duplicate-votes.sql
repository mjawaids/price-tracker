-- People's reports on duplicate products, as votes per pair: the shared step of
-- merge-auto.sql (rule "reported") and unmerge-find.sql (reason "people"), included
-- with \ir. There is no moderator, so only real contributors count, and the majority
-- decides. Fills the temp tables
--   voters(id)                       people whose reports count
--   votes(lo, hi, same_n, not_n, same_fresh, split_at)
--     per unordered pair (lo < hi): qualifying people whose newest report on it says
--     "same" / "not the same"; same_fresh = the "same" ones made after people last split
--     the pair (= same_n when they never did); split_at = when that was.
--
-- A voter: an account at least 7 days old, confirmed, not anonymous, banned or deleted;
-- prices not discounted by reporter_trust (weight ≥ 1, no row = 1); and accepted prices
-- for at least 3 products in the last 60 days (merge copies and "wrong price" reports
-- aside) — the bar for suggesting a shared shop too (promote-suggestions.sql). A person
-- who sent both kinds on a pair counts once, for the newer. Withdrawn reports don't count.

CREATE TEMP TABLE voters AS
SELECT u.id
FROM auth.users u
LEFT JOIN spendless.reporter_trust t ON t.user_id = u.id
WHERE u.id IN (SELECT DISTINCT user_id FROM spendless.duplicate_reports WHERE withdrawn_at IS NULL)
  AND u.created_at <= now() - interval '7 days'
  AND u.email_confirmed_at IS NOT NULL AND NOT coalesce(u.is_anonymous, false)
  AND (u.banned_until IS NULL OR u.banned_until < now()) AND u.deleted_at IS NULL
  AND coalesce(t.weight, 1) >= 1
  AND (
    SELECT count(DISTINCT r.product_id) FROM spendless.price_reports r
    WHERE r.user_id = u.id AND r.status = 'accepted' AND r.copy_of IS NULL AND r.source <> 'dispute'
      AND r.price IS NOT NULL AND r.observed_at > now() - interval '60 days'
  ) >= 3;

CREATE TEMP TABLE votes AS
WITH latest AS (
  SELECT DISTINCT ON (r.user_id, least(r.product_id, r.other_id), greatest(r.product_id, r.other_id))
    r.user_id, least(r.product_id, r.other_id) AS lo, greatest(r.product_id, r.other_id) AS hi, r.kind, r.created_at
  FROM spendless.duplicate_reports r
  JOIN voters v ON v.id = r.user_id
  WHERE r.withdrawn_at IS NULL
  ORDER BY r.user_id, least(r.product_id, r.other_id), greatest(r.product_id, r.other_id), r.created_at DESC
), split AS (
  SELECT least(from_id, into_id) AS lo, greatest(from_id, into_id) AS hi, max(undone_at) AS at
  FROM spendless.product_merges
  WHERE undone_at IS NOT NULL AND undo_reason = 'people'
  GROUP BY 1, 2
)
SELECT l.lo, l.hi,
  count(*) FILTER (WHERE l.kind = 'same') AS same_n,
  count(*) FILTER (WHERE l.kind = 'not_same') AS not_n,
  count(*) FILTER (WHERE l.kind = 'same' AND (s.at IS NULL OR l.created_at > s.at)) AS same_fresh,
  s.at AS split_at
FROM latest l
LEFT JOIN split s ON s.lo = l.lo AND s.hi = l.hi
GROUP BY l.lo, l.hi, s.at;
