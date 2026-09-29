-- Live progress for sync runs, so the UI can show what is being processed
-- and admins can safely leave the page while it finishes in the background.

alter table public.knowledge_sync_runs
  add column if not exists current_path text;
