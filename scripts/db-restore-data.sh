#!/usr/bin/env bash
#
# Restore a pg_dump file into a target database using DATA-ONLY copying.
#
# Why: the local schema already exists (from supabase/migrations). Dropping and
# recreating tables fails because the local `postgres` user doesn't own the
# Supabase-managed auth tables. This script instead TRUNCATEs the target tables
# and replays only the COPY data, so nothing is dropped.
#
# Usage:
#   ./scripts/db-restore-data.sh <TARGET_URL> <DUMP_DIR>
#
set -euo pipefail

TARGET="${1:-}"
DUMP_DIR="${2:-}"
PSQL="${PSQL:-psql}"

if [[ -z "$TARGET" || -z "$DUMP_DIR" ]]; then
  echo "Usage: ./scripts/db-restore-data.sh <TARGET_URL> <DUMP_DIR>"
  exit 1
fi

if [[ ! -f "$DUMP_DIR/public.sql" ]]; then
  echo "No public.sql found in $DUMP_DIR"
  exit 1
fi

echo "==> Extracting data-only sections from dumps"

# pg_dump writes a "Data for Name: <table>" section per table. We keep only
# those sections so no DDL runs (no DROP, no CREATE, no ownership errors).
extract_data() {
  local file="$1" out="$2"
  awk '
    /^-- Data for Name:/ { keep=1; print; next }
    /^-- (Name|Data for Name):/ && !/^-- Data for Name:/ { keep=0 }
    /^\\\.$/ { if (keep) print; next }
    keep { print }
  ' "$file" > "$out"
}

extract_data "$DUMP_DIR/public.sql" "$DUMP_DIR/public.data.sql"
extract_data "$DUMP_DIR/auth.sql" "$DUMP_DIR/auth.data.sql"

echo "    public.data.sql: $(wc -l < "$DUMP_DIR/public.data.sql") lines"
echo "    auth.data.sql:   $(wc -l < "$DUMP_DIR/auth.data.sql") lines"

echo
echo "==> Truncating target tables (public + auth, cascade)"
$PSQL "$TARGET" -v ON_ERROR_STOP=1 -q << 'SQL'
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT format('%I.%I', schemaname, tablename) AS t
    FROM pg_tables
    WHERE schemaname IN ('public', 'auth')
      AND tablename NOT LIKE '\_%'
  LOOP
    EXECUTE format('TRUNCATE TABLE %s CASCADE', r.t);
  END LOOP;
END $$;
SQL

echo
echo "==> Restoring data"
for SCHEMA in auth public; do
  FILE="$DUMP_DIR/$SCHEMA.data.sql"
  [[ -s "$FILE" ]] || { echo "    [$SCHEMA] no data, skipping"; continue; }
  echo "    [$SCHEMA] loading…"
  $PSQL "$TARGET" -v ON_ERROR_STOP=0 -q \
    -c "SET session_replication_role = replica;" \
    -f "$FILE" 2>&1 | grep -iE "error" | head -20 || true
done

echo
echo "==> Row counts:"
$PSQL "$TARGET" -tA -c "select 'auth.users', count(*) from auth.users
  union all select 'public.profiles', count(*) from public.profiles
  union all select 'public.knowledge_articles', count(*) from public.knowledge_articles
  union all select 'public.knowledge_chunks', count(*) from public.knowledge_chunks;"

echo
echo "==> Done."
