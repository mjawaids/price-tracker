-- Still-to-buy reminders: what happened to each claimed reminder. The SQL side of
-- scripts/push/reminders.ts, run with --single-transaction after sending, with
-- results.json beside it: [{"id", "outcome", "onesignal_id"?, "error"?}].
--   sent      → status 'sent', sent_at now
--   failed    → status 'failed' (OneSignal refused it; it would refuse it again)
--   release   → the row is deleted: never sent, so the next run may try again
--   ambiguous → left 'claimed' with the error: it may have gone out, and a missed
--               reminder is better than a second one
-- Then rows older than 90 days go. Prints one JSON line of counts.
\set ON_ERROR_STOP on
\set results `cat results.json`

CREATE TEMP TABLE r ON COMMIT DROP AS
SELECT x.id, x.outcome, x.onesignal_id, left(x.error, 500) AS error
FROM jsonb_to_recordset(:'results'::jsonb) AS x(id bigint, outcome text, onesignal_id text, error text);

UPDATE spendless.notification_log n
SET status = 'sent', sent_at = now(), onesignal_id = left(r.onesignal_id, 100), error = NULL
FROM r WHERE r.id = n.id AND r.outcome = 'sent' AND n.status = 'claimed';

UPDATE spendless.notification_log n
SET status = 'failed', error = r.error
FROM r WHERE r.id = n.id AND r.outcome = 'failed' AND n.status = 'claimed';

UPDATE spendless.notification_log n
SET error = r.error
FROM r WHERE r.id = n.id AND r.outcome = 'ambiguous' AND n.status = 'claimed';

DELETE FROM spendless.notification_log n
USING r WHERE r.id = n.id AND r.outcome = 'release' AND n.status = 'claimed';

WITH old AS (
  DELETE FROM spendless.notification_log WHERE created_at < now() - interval '90 days' RETURNING 1
)
SELECT json_build_object(
  'sent', (SELECT count(*) FROM r WHERE outcome = 'sent'),
  'failed', (SELECT count(*) FROM r WHERE outcome = 'failed'),
  'released', (SELECT count(*) FROM r WHERE outcome = 'release'),
  'ambiguous', (SELECT count(*) FROM r WHERE outcome = 'ambiguous'),
  'swept', (SELECT count(*) FROM old)
);
