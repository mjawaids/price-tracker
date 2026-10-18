-- Still-to-buy reminders: who is due now. The SQL side of scripts/push/reminders.ts.
-- One transaction; claims a notification_log row per person due, prints one JSON line
-- ({"checked", "due": [{log_id, push_alias, open_count}]}), then COMMITs (commit=on)
-- or ROLLs BACK (commit=off, a dry run). Rows are committed BEFORE anything is sent,
-- so a crash or a re-run can never send twice.
-- Variables (validated by the script): commit, min_age_hours, gap_hours, hour_from,
-- hour_to, max_claims.
--
-- Someone is due when reminders are on, it's hour_from:00–hour_to:00 in their time
-- zone, and they have open items (not ticked, deleted or cleared, on a list that
-- isn't deleted), the oldest at least min_age_hours old; and either they were never
-- reminded, or their items changed since the last reminder AND that was at least
-- gap_hours ago (ticking one thing doesn't bring another reminder that evening).
-- An item's age uses the earlier of created_at (the device's clock) and updated_at
-- (the server's), so a device with its clock ahead can't hold reminders back.
\set ON_ERROR_STOP on
BEGIN;
SELECT pg_advisory_xact_lock(hashtextextended('spendless.push_reminders', 0)) \gset lock_

CREATE TEMP TABLE awake ON COMMIT DROP AS
SELECT p.user_id, p.push_alias
FROM spendless.push_settings p
JOIN pg_timezone_names z ON z.name = p.timezone
WHERE p.enabled
  AND extract(hour FROM now() AT TIME ZONE p.timezone) >= :'hour_from'::int
  AND extract(hour FROM now() AT TIME ZONE p.timezone) < :'hour_to'::int;

CREATE TEMP TABLE due ON COMMIT DROP AS
WITH items AS (
  SELECT i.user_id,
         count(*) FILTER (WHERE open) AS open_count,
         min(least(i.created_at, i.updated_at)) FILTER (WHERE open) AS oldest_open,
         max(i.updated_at) AS last_change
  FROM spendless.list_items i
  JOIN spendless.lists l ON l.id = i.list_id
  CROSS JOIN LATERAL (
    SELECT (NOT i.done AND i.deleted_at IS NULL AND i.cleared_at IS NULL AND l.deleted_at IS NULL) AS open
  ) o
  WHERE i.user_id IN (SELECT user_id FROM awake)
  GROUP BY i.user_id
),
last_nudge AS (
  SELECT n.user_id, max(n.created_at) AS at
  FROM spendless.notification_log n
  WHERE n.user_id IN (SELECT user_id FROM awake) AND n.kind = 'still_to_buy'
  GROUP BY n.user_id
)
SELECT a.user_id, a.push_alias, it.open_count::int AS open_count
FROM awake a
JOIN items it ON it.user_id = a.user_id
LEFT JOIN last_nudge ln ON ln.user_id = a.user_id
WHERE it.open_count > 0
  AND it.oldest_open <= now() - make_interval(hours => :'min_age_hours'::int)
  AND (
    ln.at IS NULL
    OR (it.last_change > ln.at AND ln.at <= now() - make_interval(hours => :'gap_hours'::int))
  )
ORDER BY a.user_id
LIMIT :'max_claims'::int;

CREATE TEMP TABLE claimed ON COMMIT DROP AS
WITH ins AS (
  INSERT INTO spendless.notification_log (user_id, kind, open_count, status)
  SELECT d.user_id, 'still_to_buy', d.open_count, 'claimed' FROM due d
  RETURNING id, user_id, open_count
)
SELECT ins.id AS log_id, d.push_alias, ins.open_count
FROM ins JOIN due d ON d.user_id = ins.user_id;

SELECT json_build_object(
  'checked', (SELECT count(*) FROM awake),
  'due', coalesce((SELECT json_agg(json_build_object('log_id', log_id, 'push_alias', push_alias, 'open_count', open_count) ORDER BY log_id) FROM claimed), '[]'::json)
);

\if :commit
COMMIT;
\else
ROLLBACK;
\endif
