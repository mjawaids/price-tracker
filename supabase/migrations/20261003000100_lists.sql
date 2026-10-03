/*
  # Lists: quick grocery & shopping lists (offline-first)

  1. New tables
    - `lists` — a user's lists ("Groceries", "Pharmacy", …).
    - `list_items` — one row per item. Free text name; quantity, unit, note and
      category are optional. `product_id` optionally links an item to a tracked
      product in Compare.

  2. Offline sync
    - Ids are generated on the device so rows can be created offline.
    - `updated_at` is always set by the server (trigger below), so clients can
      pull changes with `updated_at > <last cursor>`.
    - Deletes are soft (`deleted_at`) so they reach the user's other devices.
    - `cleared_at` hides a ticked item from the list but keeps it for
      "often bought" suggestions.

  3. Security
    - RLS: users can only read and write their own rows.

  4. Notes
    - Lives in the `spendless` schema (see 20261003000000_spendless_schema.sql).
    - Idempotent: safe to run multiple times.
    - `spendless.shopping_lists` ("My Cart" for Compare) is unchanged.
*/

CREATE TABLE IF NOT EXISTS spendless.lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  sort_order double precision NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS spendless.list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES spendless.lists(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  quantity numeric CHECK (quantity IS NULL OR quantity > 0),
  unit text,
  note text CHECK (note IS NULL OR char_length(note) <= 500),
  category text,
  done boolean NOT NULL DEFAULT false,
  done_at timestamptz,
  cleared_at timestamptz,
  sort_order double precision NOT NULL DEFAULT 0,
  product_id uuid REFERENCES spendless.products(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE spendless.lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE spendless.list_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own lists" ON spendless.lists;
CREATE POLICY "Users can manage their own lists"
  ON spendless.lists
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own list items" ON spendless.list_items;
CREATE POLICY "Users can manage their own list items"
  ON spendless.list_items
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM spendless.lists l WHERE l.id = list_id AND l.user_id = auth.uid())
  );

-- Server-authoritative updated_at on every insert and update (sync cursor).
CREATE OR REPLACE FUNCTION spendless.set_server_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lists_set_updated_at ON spendless.lists;
CREATE TRIGGER lists_set_updated_at
  BEFORE INSERT OR UPDATE ON spendless.lists
  FOR EACH ROW EXECUTE FUNCTION spendless.set_server_updated_at();

DROP TRIGGER IF EXISTS list_items_set_updated_at ON spendless.list_items;
CREATE TRIGGER list_items_set_updated_at
  BEFORE INSERT OR UPDATE ON spendless.list_items
  FOR EACH ROW EXECUTE FUNCTION spendless.set_server_updated_at();

CREATE INDEX IF NOT EXISTS lists_user_updated_idx ON spendless.lists(user_id, updated_at);
CREATE INDEX IF NOT EXISTS list_items_user_updated_idx ON spendless.list_items(user_id, updated_at);
CREATE INDEX IF NOT EXISTS list_items_list_id_idx ON spendless.list_items(list_id);

GRANT ALL ON spendless.lists, spendless.list_items TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION spendless.set_server_updated_at() TO anon, authenticated, service_role;
