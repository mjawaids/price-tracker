-- A run that stopped with an error before writing: record it for monitoring.
-- Variables: source, started_at, note (a short code, never page content).
INSERT INTO spendless.import_runs (source, started_at, status, note)
VALUES (:'source', :'started_at'::timestamptz, 'failed', left(:'note', 200));
