#!/usr/bin/env bash
# REMOTE + SHARED PROJECT. Applies the Agendo migrations and the catalog seed with psql.
# Never uses `supabase db push` (the migration history is shared between apps).
# Requires SUPABASE_DB_URL exported in your shell (not stored in any file of the repo).
# Run it only after reading docs/runbook-lanzamiento.md, step 1.
set -euo pipefail

: "${SUPABASE_DB_URL:?Export SUPABASE_DB_URL in your shell first}"

exists=$(psql "$SUPABASE_DB_URL" -Atc "select 1 from pg_namespace where nspname = 'agendo';")
if [[ -n "$exists" ]]; then
  echo "Schema 'agendo' already exists in the target database. Stopping: check what was applied before." >&2
  exit 1
fi

read -r -p "Apply Agendo migrations + catalog seed to the REMOTE shared project? Type 'apply' to continue: " answer
[[ "$answer" == "apply" ]] || { echo "Aborted."; exit 1; }

for f in supabase/migrations/*.sql; do
  echo "Applying $f"
  psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "$f"
done
# Only the catalog. Never 02_demo_data.sql or 03_local_vault.sql on the remote.
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/seed/01_catalog.sql
echo "Done. Record the applied files and date in docs/implementation/bitacora.md."
