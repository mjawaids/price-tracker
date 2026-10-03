#!/usr/bin/env bash
# Applies SpendLess database migrations from a directory, in filename order.
#
#   SUPABASE_DB_URL=postgres://… scripts/db-migrate.sh supabase/migrations
#   SUPABASE_DB_URL=postgres://… scripts/db-migrate.sh supabase/post-deploy
#
# Options:
#   --dry-run       list what would be applied, change nothing
#   --from-scratch  also apply legacy migrations (brand-new database only)
#
# Why not `supabase db push`? The Supabase project is shared with other apps, so its
# shared migration history holds their versions too. SpendLess tracks its own
# migrations in spendless.schema_migrations instead.
#
# Each file runs in ONE transaction together with its bookkeeping row, so a failed
# migration leaves nothing half-applied and is retried on the next run.
set -euo pipefail

# Files older than this were applied by the old Bolt workflow (and target `public`);
# they are skipped unless --from-scratch is given.
LEGACY_BEFORE="20261003000000"

DRY_RUN=false
FROM_SCRATCH=false
DIR=""
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --from-scratch) FROM_SCRATCH=true ;;
    -*) echo "Unknown option: $arg" >&2; exit 2 ;;
    *) DIR="$arg" ;;
  esac
done

if [[ -z "$DIR" ]]; then
  echo "Usage: $0 [--dry-run] [--from-scratch] <migrations-dir>" >&2
  exit 2
fi
: "${SUPABASE_DB_URL:?SUPABASE_DB_URL must be set (Supabase session pooler connection string)}"

if [[ ! -d "$DIR" ]]; then
  echo "No migrations directory at $DIR — nothing to do."
  exit 0
fi

PSQL=(psql "$SUPABASE_DB_URL" -X -q -v ON_ERROR_STOP=1)

# Bookkeeping table. RLS on with no policies: the Data API (which exposes the
# spendless schema) can never read or change it; only the migration role can.
BOOTSTRAP_SQL="
SET client_min_messages = warning;
CREATE SCHEMA IF NOT EXISTS spendless;
CREATE TABLE IF NOT EXISTS spendless.schema_migrations (
  version text PRIMARY KEY,
  name text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE spendless.schema_migrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON spendless.schema_migrations FROM anon, authenticated;
"

if [[ "$DRY_RUN" == true ]]; then
  has_table="$("${PSQL[@]}" -Atc "SELECT to_regclass('spendless.schema_migrations') IS NOT NULL")"
  if [[ "$has_table" == t ]]; then
    applied="$("${PSQL[@]}" -Atc "SELECT version FROM spendless.schema_migrations")"
  else
    applied=""
  fi
else
  "${PSQL[@]}" -c "$BOOTSTRAP_SQL"
  applied="$("${PSQL[@]}" -Atc "SELECT version FROM spendless.schema_migrations")"
fi

count=0
shopt -s nullglob
files=("$DIR"/*.sql)
IFS=$'\n' files=($(printf '%s\n' "${files[@]}" | sort))
unset IFS

for file in "${files[@]}"; do
  base="$(basename "$file" .sql)"
  if [[ ! "$base" =~ ^([0-9]{14})_[A-Za-z0-9_]+$ ]]; then
    echo "Bad migration file name: $base (expected <14-digit timestamp>_<name>.sql)" >&2
    exit 1
  fi
  version="${BASH_REMATCH[1]}"

  if [[ "$FROM_SCRATCH" != true && "$version" < "$LEGACY_BEFORE" ]]; then
    continue
  fi
  if grep -qx "$version" <<<"$applied"; then
    continue
  fi

  count=$((count + 1))
  if [[ "$DRY_RUN" == true ]]; then
    echo "Would apply: $base"
    continue
  fi
  echo "Applying: $base"
  "${PSQL[@]}" --single-transaction \
    -c "SET LOCAL client_min_messages = warning" \
    -f "$file" \
    -c "INSERT INTO spendless.schema_migrations (version, name) VALUES ('$version', '$base')"
done

if [[ "$DRY_RUN" != true ]]; then
  # Migrations may GRANT on every table in the schema; keep the bookkeeping table private.
  "${PSQL[@]}" -c "REVOKE ALL ON spendless.schema_migrations FROM anon, authenticated;"
fi

if [[ "$count" -eq 0 ]]; then
  echo "Database is up to date ($DIR)."
else
  echo "$count migration(s) $([[ "$DRY_RUN" == true ]] && echo "pending" || echo "applied") from $DIR."
fi
