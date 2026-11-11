#!/usr/bin/env bash
# Applies every migration and the seed to a throwaway database on a plain
# PostgreSQL server, then runs the pgTAP suite and the contract drift check.
#
# Needs: a running PostgreSQL 15+ with the pgtap, citext and pgcrypto
# extensions available, plus psql and pg_prove on PATH.
# Connection comes from the standard PG* variables (PGHOST, PGPORT, PGUSER,
# PGPASSWORD); the user must be able to create databases and roles.
#
#   scripts/db-test.sh            run everything, drop the database afterwards
#   KEEP_DB=1 scripts/db-test.sh  leave the database in place for inspection
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PGHOST="${PGHOST:-127.0.0.1}"
export PGPORT="${PGPORT:-5432}"
export PGUSER="${PGUSER:-postgres}"
export PGPASSWORD="${PGPASSWORD:-postgres}"
DB="${TEST_DB_NAME:-brobatch_test_$$}"
# Keep routine NOTICE chatter out of the output.
export PGOPTIONS="${PGOPTIONS:--c client_min_messages=warning}"

for tool in psql pg_prove; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "error: '$tool' is not installed. See docs/DATABASE.md for setup." >&2
    exit 2
  fi
done

if ! psql -d postgres -Atqc 'select 1' >/dev/null 2>&1; then
  echo "error: cannot connect to PostgreSQL at $PGHOST:$PGPORT as $PGUSER." >&2
  echo "       Start a server or set PGHOST/PGPORT/PGUSER/PGPASSWORD. See docs/DATABASE.md." >&2
  exit 2
fi

cleanup() {
  if [[ "${KEEP_DB:-0}" != "1" ]]; then
    psql -d postgres -qc "drop database if exists \"$DB\" with (force)" >/dev/null 2>&1 || true
  else
    echo "Kept database: $DB"
  fi
}
trap cleanup EXIT

run_sql() { psql -d "$DB" -v ON_ERROR_STOP=1 -q -X "$@"; }

echo "==> Creating database $DB"
psql -d postgres -v ON_ERROR_STOP=1 -qc "drop database if exists \"$DB\" with (force)"
psql -d postgres -v ON_ERROR_STOP=1 -qc "create database \"$DB\""

echo "==> Applying Supabase shim"
run_sql -f "$ROOT/scripts/db/supabase-shim.sql"

echo "==> Applying migrations"
for migration in "$ROOT"/supabase/migrations/*.sql; do
  echo "    $(basename "$migration")"
  run_sql --single-transaction -f "$migration"
done

echo "==> Applying seed"
run_sql --single-transaction -f "$ROOT/supabase/seed.sql"

echo "==> Checking contracts match the database"
node "$ROOT/scripts/check-contract-drift.mjs" "$DB"

echo "==> Running pgTAP tests"
pg_prove -d "$DB" --ext .sql "$ROOT/supabase/tests"

echo "==> Running concurrency test"
"$ROOT/scripts/db-concurrency-test.sh" "$DB"

echo "==> Database checks passed"
