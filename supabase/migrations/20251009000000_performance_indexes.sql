-- Performance indexes for hot query paths.
--
-- As partner_chat_logs and api_usage grow (a busy partner can write tens of
-- thousands of rows a day), the queries that run on every chat request need
-- composite indexes that match their WHERE + ORDER BY exactly. The existing
-- single-column indexes force Postgres to pick one predicate and then sort.
--
-- These are created idempotently so the migration is safe to re-run.

-- Rate-limit counting for the playground runs:
--   where partner_id = $1 and created_at >= $2
-- Dashboard session lists and "clear all history" also filter by partner_id
-- and order/scan by created_at.
create index if not exists partner_chat_logs_partner_created_idx
  on public.partner_chat_logs (partner_id, created_at desc);

-- Rate-limit counting for API-key requests runs on EVERY /api/v1 call:
--   where api_key_id = $1 and created_at >= $2
create index if not exists api_usage_key_created_idx
  on public.api_usage (api_key_id, created_at desc);

-- Plain created_at scan for retention/cleanup jobs and status-page windows.
-- (partner_chat_logs_created_at_idx already exists from the initial schema; the
-- composite partner + created_at index above covers the per-partner ordering.)

-- Partial index for playground queries, which always filter api_key_id is null:
--   where partner_id = $1 and api_key_id is null and created_at >= $2
create index if not exists partner_chat_logs_playground_idx
  on public.partner_chat_logs (partner_id, created_at desc)
  where api_key_id is null;
