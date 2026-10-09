#!/usr/bin/env bash
#
# Copy a Supabase database (schema + data, including auth users) from one
# Postgres to another. Read-only on the SOURCE — the source is never modified.
#
# Typical use: cloud Supabase  ──►  local Supabase.
# The same script later copies local ──► DigitalOcean self-hosted Supabase.
#
# Prerequisites: pg_dump and psql on PATH (Homebrew libpq).
#   export PATH="/opt/homebrew/opt/libpq/bin:$PATH"
#
# Usage:
#   ./scripts/db-copy.sh <SOURCE_URL> <TARGET_URL>
#
# Get URLs:
#   SOURCE (cloud): Supabase dashboard → Connect → Session pooler URI
#   TARGET (local): postgresql://postgres:postgres@127.0.0.1:54322/postgres
#
set -euo pipefail

SOURCE="${1:-}"
TARGET="${2:-}"

if [[ -z "$SOURCE" || -z "$TARGET" ]]; then
  echo "Usage: ./scripts/db-copy.sh <SOURCE_URL> <TARGET_URL>"
  echo
  echo "Example:"
  echo '  ./scripts/db-copy.sh "postgresql://postgres:pw@db.xxx.supabase.co:5432/postgres" \'
  echo '                     "postgresql://postgres:postgres@127.0.0.1:54322/postgres"'
  exit 1
fi

DUMP_DIR="${TMPDIR:-/tmp}/supabase-copy-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DUMP_DIR"

# Schemas to move. `auth` carries the logins (users, identities); `public` the
# app data. `storage`/`realtime` are skipped — local regenerates those.
SCHEMAS=(auth public)

echo "==> Dumping schemas: ${SCHEMAS[*]}"
echo "    from: ${SOURCE%%:*}://***@${SOURCE##*@}"
echo "    into: $DUMP_DIR"

for SCHEMA in "${SCHEMAS[@]}"; do
  echo
  echo "==> [$SCHEMA] schema + data (excluding Supabase-managed noise)…"
  pg_dump "$SOURCE" \
    --schema="$SCHEMA" \
    --clean --if-exists \
    --no-owner --no-privileges \
    --exclude-table-data="auth.audit_log_entries" \
    --exclude-table-data="auth.refresh_tokens" \
    --exclude-table-data="auth.sessions" \
    --exclude-table-data="auth.flow_state" \
    --exclude-table-data="auth.mfa_*" \
    --exclude-table-data="auth.one_time_tokens" \
    --file="$DUMP_DIR/$SCHEMA.sql"
  echo "    wrote $DUMP_DIR/$SCHEMA.sql"
done

echo
echo "==> Restoring into target…"
# Disable FK checks during load so table order doesn't matter; wrap in a txn.
for SCHEMA in "${SCHEMAS[@]}"; do
  echo "    [$SCHEMA] restoring…"
  psql "$TARGET" -v ON_ERROR_STOP=1 -q -c "SET session_replication_role = replica;" -f "$DUMP_DIR/$SCHEMA.sql" 2>&1 | tail -5 || true
done

echo
echo "==> Row counts in target:"
psql "$TARGET" -tA -c "select 'auth.users', count(*) from auth.users
  union all select 'public.profiles', count(*) from public.profiles
  union all select 'public.knowledge_articles', count(*) from public.knowledge_articles
  union all select 'public.knowledge_chunks', count(*) from public.knowledge_chunks;" 2>/dev/null || echo "  (some tables missing — check output above)"

echo
echo "==> Done. Dumps kept at: $DUMP_DIR"
echo
echo "IMPORTANT for logins to keep working across environments:"
echo "  - Reuse the SAME JWT secret on the target (local uses a fixed dev secret)."
echo "  - Reuse the same Google OAuth client ID/secret and set the redirect URL."
echo "  - Users may need to log in once (sessions/refresh tokens are not copied)."
