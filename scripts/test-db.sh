#!/usr/bin/env bash
# Runs the pgTAP suites in supabase/tests/database against a database
# (default: the local Supabase stack). Each file runs in its own transaction
# and is rolled back. Fails on any "not ok", plan mismatch or SQL error.
set -euo pipefail
DB_URL="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
DIR="$(cd "$(dirname "$0")/../supabase/tests/database" && pwd)"
failed=0
for f in "$DIR"/*.test.sql; do
  echo "# $(basename "$f")"
  out="$(cd "$DIR" && psql "$DB_URL" -X -q -t -A -v ON_ERROR_STOP=1 -f "$f" 2>&1)" || { echo "$out"; failed=1; continue; }
  echo "$out" | grep -E '^(ok|not ok|1\.\.|#)' || true
  if echo "$out" | grep -qE '^not ok|Looks like|ERROR'; then failed=1; fi
done
if [ "$failed" -ne 0 ]; then echo "DATABASE TESTS FAILED"; exit 1; fi
echo "All database tests passed"
