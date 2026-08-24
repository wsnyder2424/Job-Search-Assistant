#!/usr/bin/env bash
# Apply the schema to a throwaway Postgres and assert the household isolation
# rules actually hold. Run against any Postgres 14+ instance:
#
#   PGHOST=localhost PGPORT=5432 PGUSER=postgres ./supabase/tests/run.sh
#
# 00_supabase_stubs.sql stands in for the parts of Supabase the schema leans on
# (the auth schema, auth.uid(), the authenticated role) so the policies can be
# exercised without a live project.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
psql_args=(-v ON_ERROR_STOP=1 -q)

echo "==> resetting schemas"
psql "${psql_args[@]}" -c "drop schema if exists public cascade; create schema public; drop schema if exists auth cascade;" >/dev/null

echo "==> applying stubs"
psql "${psql_args[@]}" -f "$here/00_supabase_stubs.sql" >/dev/null

echo "==> applying schema"
psql "${psql_args[@]}" -f "$here/../schema.sql" >/dev/null

echo "==> running RLS assertions"
psql -v ON_ERROR_STOP=1 -f "$here/01_rls_test.sql" 2>&1 \
  | grep -E 'pass |FAIL|ERROR|ALL RLS' \
  | sed -E 's/^psql:[^ ]* //; s/NOTICE:  //'
