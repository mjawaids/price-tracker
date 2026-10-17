-- Invite a friend. Each person has one invite code (a random 8-character code, never
-- their id) and the name their invites show ("Jawaid invited you"), which they choose
-- in the app. Someone who signs up from a link records it once, in `referrals`.
--
-- Who sees what:
-- - invite_codes: only its owner reads and edits it (the name; the code never changes).
-- - referrals: the person who joined writes their own row once; the inviter can count
--   the rows for their code but read only `code` and `created_at` (never who joined).
-- - Signed out, the sign-up page needs the name for one code: `invite_from(code)`
--   returns just that, for an exact code. It is SECURITY DEFINER, because a policy that
--   let signed-out visitors read invite_codes would let anyone list every code and name.

-- ── Codes ────────────────────────────────────────────────────────────────────
-- 8 characters from 32 (A–Z without I and O, 2–9): ≈1.1e12 codes. Random bytes from
-- gen_random_uuid(); bytes 0–5 and 10–11 of a v4 uuid carry no version or variant bits.
CREATE OR REPLACE FUNCTION spendless.new_invite_code()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = ''
AS $$
  SELECT string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (get_byte(b, i) % 32) + 1, 1), '' ORDER BY n)
  FROM (SELECT uuid_send(gen_random_uuid()) AS b) s,
       unnest(ARRAY[0, 1, 2, 3, 4, 5, 10, 11]) WITH ORDINALITY AS t(i, n);
$$;

CREATE TABLE IF NOT EXISTS spendless.invite_codes (
  user_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE DEFAULT spendless.new_invite_code() CHECK (code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  -- What the invite says it's from. Shown to anyone with the link, so plain names only:
  -- no web addresses, emails, phone numbers or markup.
  display_name text CHECK (
    display_name IS NULL OR (
      char_length(btrim(display_name)) BETWEEN 1 AND 30
      AND display_name !~ '[0-9]{3,}|[/:@<>\\]'
      AND display_name !~* '(www\.|\.[a-z]{2,}\M)'
    )
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── Who joined from which code ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spendless.referrals (
  -- The person who joined: one row each, ever.
  user_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL REFERENCES spendless.invite_codes(code) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS referrals_code_idx ON spendless.referrals(code);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE spendless.invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE spendless.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read own invite code" ON spendless.invite_codes;
CREATE POLICY "Read own invite code"
  ON spendless.invite_codes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Create own invite code" ON spendless.invite_codes;
CREATE POLICY "Create own invite code"
  ON spendless.invite_codes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Name own invites" ON spendless.invite_codes;
CREATE POLICY "Name own invites"
  ON spendless.invite_codes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- The person who joined sees their own row; an inviter sees the rows for their code
-- (only `code` and `created_at` are granted below, so never who joined).
DROP POLICY IF EXISTS "Read own or own code's referrals" ON spendless.referrals;
CREATE POLICY "Read own or own code's referrals"
  ON spendless.referrals FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR code IN (SELECT c.code FROM spendless.invite_codes c WHERE c.user_id = auth.uid())
  );

-- Once, for yourself, and never your own code (the subquery sees only your own code).
DROP POLICY IF EXISTS "Record own referral" ON spendless.referrals;
CREATE POLICY "Record own referral"
  ON spendless.referrals FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (SELECT 1 FROM spendless.invite_codes c WHERE c.code = referrals.code AND c.user_id = auth.uid())
  );

-- ── Grants ───────────────────────────────────────────────────────────────────
-- Column grants keep the code fixed and who joined hidden.
REVOKE ALL ON spendless.invite_codes FROM anon, authenticated;
GRANT SELECT ON spendless.invite_codes TO authenticated;
GRANT INSERT (display_name) ON spendless.invite_codes TO authenticated;
GRANT UPDATE (display_name, updated_at) ON spendless.invite_codes TO authenticated;
GRANT ALL ON spendless.invite_codes TO service_role;

REVOKE ALL ON spendless.referrals FROM anon, authenticated;
GRANT SELECT (code, created_at) ON spendless.referrals TO authenticated;
GRANT INSERT (code) ON spendless.referrals TO authenticated;
GRANT ALL ON spendless.referrals TO service_role;

REVOKE ALL ON FUNCTION spendless.new_invite_code() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION spendless.new_invite_code() TO authenticated, service_role;

-- ── The name for one code (sign-up page, signed out) ────────────────────────
CREATE OR REPLACE FUNCTION spendless.invite_from(p_code text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT btrim(c.display_name)
  FROM spendless.invite_codes c
  WHERE p_code ~ '^[A-HJ-NP-Z2-9]{8}$' AND c.code = p_code;
$$;

REVOKE ALL ON FUNCTION spendless.invite_from(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION spendless.invite_from(text) TO anon, authenticated, service_role;
