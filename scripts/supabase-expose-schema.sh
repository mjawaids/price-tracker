#!/usr/bin/env bash
# Makes sure a schema is listed in the project's Data API "Exposed schemas"
# (Dashboard: Project Settings → Data API). Only ever ADDS the schema — other apps
# in the shared project keep theirs.
#
#   SUPABASE_ACCESS_TOKEN=… SUPABASE_PROJECT_REF=… scripts/supabase-expose-schema.sh spendless
#
# Run it AFTER the migrations: exposing a schema that doesn't exist yet breaks the
# Data API's schema cache for every app in the project.
set -euo pipefail

SCHEMA="${1:-spendless}"
: "${SUPABASE_ACCESS_TOKEN:?SUPABASE_ACCESS_TOKEN must be set}"
: "${SUPABASE_PROJECT_REF:?SUPABASE_PROJECT_REF must be set}"

API="${SUPABASE_API_URL:-https://api.supabase.com}/v1/projects/${SUPABASE_PROJECT_REF}/postgrest"
AUTH=(-H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}")

# Never print the response: it also contains the project's JWT secret.
read_schemas() {
  curl -fsS "${AUTH[@]}" "$API" | jq -er '.db_schema | select(type == "string")'
}

current="$(read_schemas)" || {
  echo "Could not read the Data API config (check SUPABASE_ACCESS_TOKEN / SUPABASE_PROJECT_REF)." >&2
  exit 1
}

has_schema() {
  tr ',' '\n' <<<"$1" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//' | grep -qx "$SCHEMA"
}

if has_schema "$current"; then
  echo "Schema '$SCHEMA' is already exposed."
  exit 0
fi

if [[ -z "${current// /}" ]]; then
  updated="$SCHEMA"
else
  updated="${current}, ${SCHEMA}"
fi

echo "Exposing schema '$SCHEMA' (keeping: ${current})."
curl -fsS -X PATCH "${AUTH[@]}" -H "Content-Type: application/json" \
  -d "$(jq -n --arg s "$updated" '{db_schema: $s}')" \
  "$API" >/dev/null

after="$(read_schemas)"
if ! has_schema "$after"; then
  echo "Schema '$SCHEMA' still not exposed after update." >&2
  exit 1
fi
echo "Exposed schemas now: ${after}"
