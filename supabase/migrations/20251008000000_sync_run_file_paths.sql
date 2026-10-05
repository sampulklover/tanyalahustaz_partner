-- Per-file detail for sync runs.
--
-- The history table used to show only aggregate counts, so there was no way to
-- tell *which* files a run created/updated/removed. Store the paths on the run
-- row (capped in application code: newest first, at most 200 per action) so the
-- UI can expand a row and list them.
--
-- These are display-only hints, not a source of truth: a long run may exceed
-- the cap, and a failed run may leave partial data. Counts stay authoritative.

alter table public.knowledge_sync_runs
  add column if not exists created_paths jsonb not null default '[]',
  add column if not exists updated_paths jsonb not null default '[]',
  add column if not exists removed_paths jsonb not null default '[]';

comment on column public.knowledge_sync_runs.created_paths is
  'Source paths of files newly mirrored by this run (capped, display only).';
comment on column public.knowledge_sync_runs.updated_paths is
  'Source paths of files re-mirrored because their source changed (capped, display only).';
comment on column public.knowledge_sync_runs.removed_paths is
  'Source paths of mirrored files deleted because the source disappeared (capped, display only).';
