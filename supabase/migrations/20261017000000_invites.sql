-- Invite a friend. Each person has one invite code (a random 8-character code, never
-- their id) and the name their invites show ("Jawaid invited you"), which they choose
-- in the app. Someone who signs up from a link records it once, in `referrals`.
--
-- Who sees what:
-- - invite_codes: only its owner reads and edits it (the name; the code never changes).
-- - referrals: the person who joined writes their own row once, only from an account
--   under 7 days old (`my_account_is_new()`); the inviter can count the rows for their
--   code but read only `code` and `created_at` (never who joined).
-- - Signed out, the sign-up page needs the name for one code: `invite_from(code)`
--   returns just that, for an exact code. It is SECURITY DEFINER, because a policy that
--   let signed-out visitors read invite_codes would let anyone list every code and name.
--   `my_account_is_new()` is the other SECURITY DEFINER function: it reads only the
--   caller's own auth.users.created_at, which signed-in users can't read themselves.

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

-- How many decimal digits a text holds, in any script: Unicode category Nd (Latin,
-- Arabic-Indic, Urdu, Devanagari, Bengali, fullwidth, … — every range of Unicode 16,
-- generated from /\p{Nd}/u). Spelled out because the regex class [[:digit:]] depends on
-- the database's locale. Mirrored by `\p{Nd}` in cleanInviteName (src/lib/invite.ts).
CREATE OR REPLACE FUNCTION spendless.digit_count(t text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT char_length(regexp_replace(coalesce(t, ''),
    U&'[^\0030-\0039\0660-\0669\06F0-\06F9\07C0-\07C9\0966-\096F\09E6-\09EF\0A66-\0A6F'
    || U&'\0AE6-\0AEF\0B66-\0B6F\0BE6-\0BEF\0C66-\0C6F\0CE6-\0CEF\0D66-\0D6F\0DE6-\0DEF'
    || U&'\0E50-\0E59\0ED0-\0ED9\0F20-\0F29\1040-\1049\1090-\1099\17E0-\17E9\1810-\1819'
    || U&'\1946-\194F\19D0-\19D9\1A80-\1A89\1A90-\1A99\1B50-\1B59\1BB0-\1BB9\1C40-\1C49'
    || U&'\1C50-\1C59\A620-\A629\A8D0-\A8D9\A900-\A909\A9D0-\A9D9\A9F0-\A9F9\AA50-\AA59'
    || U&'\ABF0-\ABF9\FF10-\FF19\+0104A0-\+0104A9\+010D30-\+010D39\+010D40-\+010D49'
    || U&'\+011066-\+01106F\+0110F0-\+0110F9\+011136-\+01113F\+0111D0-\+0111D9'
    || U&'\+0112F0-\+0112F9\+011450-\+011459\+0114D0-\+0114D9\+011650-\+011659'
    || U&'\+0116C0-\+0116C9\+0116D0-\+0116E3\+011730-\+011739\+0118E0-\+0118E9'
    || U&'\+011950-\+011959\+011BF0-\+011BF9\+011C50-\+011C59\+011D50-\+011D59'
    || U&'\+011DA0-\+011DA9\+011F50-\+011F59\+016130-\+016139\+016A60-\+016A69'
    || U&'\+016AC0-\+016AC9\+016B50-\+016B59\+016D70-\+016D79\+01CCF0-\+01CCF9'
    || U&'\+01D7CE-\+01D7FF\+01E140-\+01E149\+01E2F0-\+01E2F9\+01E4F0-\+01E4F9'
    || U&'\+01E5F1-\+01E5FA\+01E950-\+01E959\+01FBF0-\+01FBF9'
    || ']',
    '', 'g'));
$$;

CREATE TABLE IF NOT EXISTS spendless.invite_codes (
  user_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE DEFAULT spendless.new_invite_code() CHECK (code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  -- What the invite says it's from. Shown to anyone with the link, so plain names only:
  -- no web addresses, emails, phone numbers or markup. At most 2 digits in all, in any
  -- script (spendless.digit_count), so no phone number fits however it's spaced or
  -- written ("12 34 56 78", "0300-123-4567", Urdu or Bengali digits).
  display_name text CHECK (
    display_name IS NULL OR (
      char_length(btrim(display_name)) BETWEEN 1 AND 30
      AND spendless.digit_count(display_name) <= 2
      AND display_name !~ '[/:@<>\\]'
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

-- Is the signed-in person's own account under 7 days old? Only a new account can say
-- it came from an invite, so an older one can't inflate someone's "joined" count.
-- SECURITY DEFINER because signed-in users can't read auth.users; it takes no argument
-- and answers only for the caller's own account.
CREATE OR REPLACE FUNCTION spendless.my_account_is_new()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(
    (SELECT u.created_at > now() - interval '7 days' FROM auth.users u WHERE u.id = auth.uid()),
    false
  );
$$;

-- Once, for yourself, only from a new account, and never your own code (the subquery
-- sees only your own code).
DROP POLICY IF EXISTS "Record own referral" ON spendless.referrals;
CREATE POLICY "Record own referral"
  ON spendless.referrals FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND spendless.my_account_is_new()
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

REVOKE ALL ON FUNCTION spendless.digit_count(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION spendless.digit_count(text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION spendless.my_account_is_new() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION spendless.my_account_is_new() TO authenticated, service_role;

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
