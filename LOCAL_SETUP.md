# Local Supabase for full-corpus testing

Run the whole Supabase stack on this machine so the knowledge base can grow past
the cloud free-tier caps (0.5 GB database, Disk IO budget). Your app code does
not change — only `.env` values.

## Prerequisites

- Docker Desktop installed and **running** (`docker info` succeeds)
- Supabase CLI installed (`supabase --version`)
- ~10 GB free disk, ~4 GB RAM free

## 1. Start the local stack

```bash
supabase start
```

First run pulls ~79 images (several GB, 5–15 min). When it finishes it prints:

```
API URL:            http://127.0.0.1:54321
DB URL:             postgresql://postgres:postgres@127.0.0.1:54322/postgres
Studio URL:         http://127.0.0.1:54323
anon key:           eyJ...
service_role key:   eyJ...
```

Keep this output — the keys are needed in step 4.

## 2. Apply the schema locally

```bash
supabase db reset
```

Rebuilds the local database from `supabase/migrations/` (tables, pgvector, search
functions). Re-run this any time you want a clean slate.

## 3. Export the data you already have from cloud Supabase

Get the connection string from Supabase Dashboard → **Connect**. Then:

```bash
pg_dump "postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres" \
  --data-only \
  --table=public.knowledge_articles \
  --table=public.knowledge_chunks \
  --table=public.knowledge_source_selections \
  > ~/cloud-knowledge.sql
```

`pg_dump` ships with `libpq`; install with `brew install libpq` and use its path
if `pg_dump` is not found.

## 4. Point the app at local Supabase

**Back up your current env first** so you can switch back to cloud:

```bash
cp .env .env.cloud-backup
```

Then in `.env`:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local anon key>
SUPABASE_SECRET_KEY=<local service_role key>
```

Note: `lib/supabase/admin.ts` reads `SUPABASE_SECRET_KEY` first, then
`SUPABASE_SERVICE_ROLE_KEY`. The local stack provides a `service_role` JWT — put
it in `SUPABASE_SECRET_KEY`.

## 5. Restore the data locally

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f ~/cloud-knowledge.sql
```

Verify in Studio (http://127.0.0.1:54323) that `knowledge_articles` and
`knowledge_chunks` have rows.

## 6. Sync the full corpus (no cloud caps)

```bash
npm run sync-gcs -- --all --dedupe --max-files=2000
```

No storage quota, no Disk IO budget. Concurrency can be raised if the machine
handles it.

## 7. Switch back to cloud later

```bash
cp .env.cloud-backup .env
```

## Troubleshooting

- **"Cannot connect to the Docker daemon"** — Docker Desktop is not running.
  Open it, wait for the whale icon, retry.
- **Port already in use** — edit `supabase/config.toml` port values, or stop the
  conflicting service.
- **`db reset` fails mid-way** — check migration filenames under
  `supabase/migrations/`; they must be unique and ordered by timestamp.
- **Out of disk / slow** — stop the stack with `supabase stop`, free space, retry.

## Useful commands

| Command | Does |
|---|---|
| `supabase start` | Start the local stack |
| `supabase stop` | Stop it (data kept in Docker volumes) |
| `supabase stop --no-backup` | Stop and wipe local data |
| `supabase status` | Show URLs + keys again |
| `supabase db reset` | Rebuild schema from migrations |
