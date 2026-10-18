/*
  # Still-to-buy reminders (push, via OneSignal)

  1. New tables
    - `push_settings` — one row per person: whether they want reminders, their time
      zone (reminders go out only 10:00–20:00 there) and an opaque `push_alias`, the
      id OneSignal knows this account by.
    - `notification_log` — every reminder sent (or claimed), read and written only by
      the hourly sender (`scripts/push/reminders.ts`). The last row per person is what
      keeps it to one reminder until their list changes.

  2. Security
    - `push_alias` is NOT the user id: OneSignal's Web SDK has no identity
      verification, so anyone can log a browser in as any External ID and receive
      its pushes. A random uuid only its owner can read makes that guesswork. Clients
      can't change it (column grants), so they can't probe for collisions either.
    - `push_settings`: RLS, own row only; clients insert and update `enabled` and
      `timezone`, nothing else. No delete; the row goes with the account.
    - `notification_log`: RLS on with no policies, revoked from anon/authenticated:
      only the sender (database owner) and service_role use it.
    - The trigger is SECURITY INVOKER (pg_timezone_names is readable by everyone).

  3. Notes
    - The reminder says only how many things are left: no item or list names.
    - Idempotent: safe to run more than once.
*/

CREATE TABLE IF NOT EXISTS spendless.push_settings (
  user_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  push_alias uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  timezone text NOT NULL DEFAULT 'UTC' CHECK (char_length(timezone) BETWEEN 1 AND 64),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- A zone the server doesn't know (a device can report 'Etc/Unknown' or a zone newer
-- than its tzdata) becomes UTC rather than an error: one bad zone would otherwise
-- break `AT TIME ZONE` in the sender's query for everyone.
CREATE OR REPLACE FUNCTION spendless.normalize_push_settings()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.timezone IS NULL OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_timezone_names z WHERE z.name = NEW.timezone) THEN
    NEW.timezone := 'UTC';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS push_settings_normalize ON spendless.push_settings;
CREATE TRIGGER push_settings_normalize
  BEFORE INSERT OR UPDATE ON spendless.push_settings
  FOR EACH ROW EXECUTE FUNCTION spendless.normalize_push_settings();

ALTER TABLE spendless.push_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read own push settings" ON spendless.push_settings;
CREATE POLICY "Read own push settings"
  ON spendless.push_settings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Create own push settings" ON spendless.push_settings;
CREATE POLICY "Create own push settings"
  ON spendless.push_settings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Change own push settings" ON spendless.push_settings;
CREATE POLICY "Change own push settings"
  ON spendless.push_settings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

REVOKE ALL ON spendless.push_settings FROM anon, authenticated;
GRANT SELECT ON spendless.push_settings TO authenticated;
GRANT INSERT (enabled, timezone) ON spendless.push_settings TO authenticated;
GRANT UPDATE (enabled, timezone) ON spendless.push_settings TO authenticated;
GRANT ALL ON spendless.push_settings TO service_role;

REVOKE ALL ON FUNCTION spendless.normalize_push_settings() FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS spendless.notification_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'still_to_buy' CHECK (kind IN ('still_to_buy')),
  open_count integer NOT NULL CHECK (open_count > 0),
  status text NOT NULL DEFAULT 'claimed' CHECK (status IN ('claimed', 'sent', 'failed')),
  onesignal_id text,
  error text CHECK (error IS NULL OR char_length(error) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

CREATE INDEX IF NOT EXISTS notification_log_user_created_idx
  ON spendless.notification_log (user_id, created_at DESC);

ALTER TABLE spendless.notification_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON spendless.notification_log FROM anon, authenticated;
GRANT ALL ON spendless.notification_log TO service_role;
