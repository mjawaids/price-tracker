-- Suggested shared shops. A person can suggest their own in-store shop (a private
-- catalog_stores row) as a shared one, naming the shop ("chain": a chain like Imtiaz or
-- an independent shop's name) and its area. Once enough different people suggest the
-- same shop, the nightly job (scripts/seed/promote-suggestions.ts) makes it a shared
-- in-store store and moves each person's shop into it: their prices are copied there,
-- My stores and planned list items point at it, and their private copy is closed.
-- A suggestion for a shop that is already shared is moved on the next run.
--
-- Clients only add and withdraw their own suggestions; everything else is the job's.
-- No SECURITY DEFINER: the trigger runs as the signed-in user, under RLS.

-- ── Place key: how names are compared ────────────────────────────────────────
-- "DHA Phase VIII", "dha ph 8" and "DHA Phase 8" give the same key. Only whole keys
-- are compared, so Nazimabad, North Nazimabad and Naya Nazimabad stay apart.
CREATE OR REPLACE FUNCTION spendless.place_key(t text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
DECLARE
  s text := lower(coalesce(t, ''));
  romans text[] := ARRAY['viii', 'vii', 'vi', 'iv', 'v', 'iii', 'ii', 'i'];
  nums text[] := ARRAY['8', '7', '6', '4', '5', '3', '2', '1'];
BEGIN
  s := replace(s, '&', ' and ');
  s := regexp_replace(s, '[^[:alnum:]]+', ' ', 'g');
  s := regexp_replace(s, '\mph\M', 'phase', 'g');
  s := regexp_replace(s, '\mdefen[cs]e\M', 'dha', 'g');
  FOR i IN 1 .. array_length(romans, 1) LOOP
    s := regexp_replace(s, '\mphase ' || romans[i] || '\M', 'phase ' || nums[i], 'g');
  END LOOP;
  RETURN nullif(btrim(s), '');
END;
$$;

-- ── Suggestions ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spendless.branch_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  -- The person's own shop. SET NULL, not CASCADE: after a move the closed copy may be
  -- deleted, and the row must still say which shared shop they moved into.
  store_id uuid UNIQUE REFERENCES spendless.catalog_stores(id) ON DELETE SET NULL,
  region_id text NOT NULL REFERENCES spendless.regions(id),
  -- Plain names only: no "·" (it separates chain and area in a shared shop's name), no
  -- web addresses, no phone numbers. "<chain> · <area>" must fit a store name (80).
  chain text NOT NULL CHECK (
    char_length(chain) BETWEEN 2 AND 60
    AND chain ~ '^[A-Za-z0-9 &''().,/-]+$' AND chain ~ '[A-Za-z]'
    AND chain !~ '[0-9]{6,}' AND chain !~* '(www\.|\.(com|net|org|pk|io|co|app|shop|store)\M)'
  ),
  area text NOT NULL CHECK (
    char_length(area) BETWEEN 2 AND 40
    AND area ~ '^[A-Za-z0-9 &''().,/-]+$' AND area ~ '[A-Za-z]'
    AND area !~ '[0-9]{6,}' AND area !~* '(www\.|\.(com|net|org|pk|io|co|app|shop|store)\M)'
  ),
  chain_key text NOT NULL,
  area_key text NOT NULL,
  -- open → promoted (moved into a shared shop) or declined (that shop was closed).
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'promoted', 'declined')),
  promoted_store_id uuid REFERENCES spendless.catalog_stores(id) ON DELETE SET NULL,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT branch_suggestions_name_fits CHECK (char_length(chain) + char_length(area) <= 77),
  CONSTRAINT branch_suggestions_decided CHECK ((status = 'open') = (decided_at IS NULL))
);

CREATE INDEX IF NOT EXISTS branch_suggestions_open_idx
  ON spendless.branch_suggestions(region_id, chain_key, area_key) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS branch_suggestions_user_idx ON spendless.branch_suggestions(user_id);
CREATE INDEX IF NOT EXISTS branch_suggestions_promoted_idx
  ON spendless.branch_suggestions(promoted_store_id) WHERE promoted_store_id IS NOT NULL;

-- ── Checks on a new suggestion (runs as the signed-in user) ─────────────────
CREATE OR REPLACE FUNCTION spendless.branch_suggestions_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  uid uuid := auth.uid();
  st record;
  shared_chain text;
BEGIN
  NEW.chain := btrim(regexp_replace(NEW.chain, '\s+', ' ', 'g'));
  NEW.area := btrim(regexp_replace(NEW.area, '\s+', ' ', 'g'));
  NEW.chain_key := spendless.place_key(NEW.chain);
  NEW.area_key := spendless.place_key(NEW.area);
  -- Migrations and scripts (no signed-in user) are trusted.
  IF uid IS NULL THEN
    RETURN NEW;
  END IF;

  NEW.user_id := uid;
  NEW.status := 'open';
  NEW.promoted_store_id := NULL;
  NEW.decided_at := NULL;
  NEW.created_at := now();

  -- One at a time per user, so the open-suggestion cap can't be raced.
  PERFORM pg_advisory_xact_lock(hashtextextended('spendless.branch_suggestions:' || uid::text, 0));

  SELECT s.kind, s.status, s.region_id INTO st
  FROM spendless.catalog_stores s
  WHERE s.id = NEW.store_id AND s.owner_id = uid;
  IF NOT FOUND OR st.kind <> 'physical' OR st.status <> 'active' THEN
    RAISE EXCEPTION 'Only your own open in-store shop can be suggested' USING ERRCODE = '42501';
  END IF;
  IF st.region_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM spendless.regions r WHERE r.id = st.region_id AND r.status = 'live'
  ) THEN
    RAISE EXCEPTION 'Shops can be shared only in a city with shared prices' USING ERRCODE = '42501';
  END IF;
  NEW.region_id := st.region_id;

  -- A chain that's already shared in the city keeps its spelling ("imtiaz" → "Imtiaz").
  SELECT s.chain INTO shared_chain
  FROM spendless.catalog_stores s
  WHERE s.owner_id IS NULL AND s.region_id = st.region_id AND s.chain IS NOT NULL
    AND spendless.place_key(s.chain) = NEW.chain_key
  ORDER BY s.created_at
  LIMIT 1;
  IF shared_chain IS NOT NULL THEN
    NEW.chain := shared_chain;
  END IF;

  IF (SELECT count(*) FROM spendless.branch_suggestions b WHERE b.user_id = uid AND b.status = 'open') >= 10 THEN
    RAISE EXCEPTION 'Too many shops waiting to be shared' USING ERRCODE = '54000';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS branch_suggestions_check ON spendless.branch_suggestions;
CREATE TRIGGER branch_suggestions_check
  BEFORE INSERT ON spendless.branch_suggestions
  FOR EACH ROW EXECUTE FUNCTION spendless.branch_suggestions_before_insert();

-- ── Row level security: your own suggestions; add and withdraw only ──────────
ALTER TABLE spendless.branch_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read own branch suggestions" ON spendless.branch_suggestions;
CREATE POLICY "Read own branch suggestions"
  ON spendless.branch_suggestions FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Suggest own shops" ON spendless.branch_suggestions;
CREATE POLICY "Suggest own shops"
  ON spendless.branch_suggestions FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND status = 'open'
    AND promoted_store_id IS NULL
    AND EXISTS (
      SELECT 1 FROM spendless.catalog_stores s
      WHERE s.id = store_id AND s.owner_id = (SELECT auth.uid())
        AND s.kind = 'physical' AND s.status = 'active'
        AND s.region_id = branch_suggestions.region_id
    )
    AND EXISTS (
      SELECT 1 FROM spendless.regions r
      WHERE r.id = branch_suggestions.region_id AND r.status = 'live'
    )
  );

DROP POLICY IF EXISTS "Withdraw own open suggestions" ON spendless.branch_suggestions;
CREATE POLICY "Withdraw own open suggestions"
  ON spendless.branch_suggestions FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND status = 'open');

-- ── Grants ───────────────────────────────────────────────────────────────────
GRANT ALL ON spendless.branch_suggestions TO anon, authenticated, service_role;

-- The trigger function is never called directly (default privileges would grant it).
REVOKE ALL ON FUNCTION spendless.branch_suggestions_before_insert() FROM PUBLIC, anon, authenticated;
-- The trigger calls place_key as the signed-in user.
REVOKE ALL ON FUNCTION spendless.place_key(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION spendless.place_key(text) TO authenticated, service_role;
