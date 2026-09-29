-- Admin-selected Google Cloud Storage paths to mirror.
--
-- Instead of a hard-coded prefix, knowledge admins pick the folders and files
-- they want in the UI. The sync mirrors exactly this selection.

create table if not exists public.knowledge_source_selections (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'gcs',
  -- Object path for a file, or folder prefix (no trailing slash) for a folder.
  path text not null,
  kind text not null check (kind in ('file', 'folder')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, path)
);

create index if not exists knowledge_source_selections_provider_idx
  on public.knowledge_source_selections (provider);

alter table public.knowledge_source_selections enable row level security;

-- Knowledge team can read the selection; only the service role writes it.
drop policy if exists "Knowledge team can view source selections" on public.knowledge_source_selections;
create policy "Knowledge team can view source selections"
  on public.knowledge_source_selections for select
  using (public.can_view_knowledge_workspace());

drop trigger if exists knowledge_source_selections_updated_at on public.knowledge_source_selections;
create trigger knowledge_source_selections_updated_at
  before update on public.knowledge_source_selections
  for each row execute function public.set_updated_at();
