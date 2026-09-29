-- Google Cloud Storage knowledge mirror.
--
-- Google Cloud is the single source of truth for knowledge documents (shared
-- with another system). Supabase keeps a read-only copy that the chat API reads
-- from, so a request never has to call Google Cloud.
--
-- Sync is one-way: Google Cloud Storage -> Supabase. Articles created by the
-- sync are flagged with a source_provider so the app can lock them against edits.

alter table public.knowledge_articles
  add column if not exists source_provider text,
  add column if not exists source_path text,
  add column if not exists source_etag text,
  add column if not exists source_synced_at timestamptz;

-- One Supabase article per source object. Manual articles have a null provider
-- and are left untouched by the partial index.
create unique index if not exists knowledge_articles_source_idx
  on public.knowledge_articles (source_provider, source_path)
  where source_provider is not null and source_path is not null;

create index if not exists knowledge_articles_source_provider_idx
  on public.knowledge_articles (source_provider)
  where source_provider is not null;

-- History of sync runs, shown in Dashboard -> Knowledge -> Sources.
create table if not exists public.knowledge_sync_runs (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'gcs',
  status text not null default 'running'
    check (status in ('running', 'completed', 'failed')),
  files_seen int not null default 0,
  created_count int not null default 0,
  updated_count int not null default 0,
  removed_count int not null default 0,
  skipped_count int not null default 0,
  deferred_count int not null default 0,
  failed jsonb not null default '[]',
  error text,
  embed_job_id uuid,
  created_by uuid references auth.users (id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists knowledge_sync_runs_started_idx
  on public.knowledge_sync_runs (started_at desc);

alter table public.knowledge_sync_runs enable row level security;

-- Knowledge team can read sync history; only the service role writes it.
drop policy if exists "Knowledge team can view sync runs" on public.knowledge_sync_runs;
create policy "Knowledge team can view sync runs"
  on public.knowledge_sync_runs for select
  using (public.can_view_knowledge_workspace());
