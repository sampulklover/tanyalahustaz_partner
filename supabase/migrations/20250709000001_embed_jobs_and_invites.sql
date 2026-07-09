-- Background embedding jobs for large bulk imports

create type public.knowledge_embed_job_status as enum (
  'pending',
  'processing',
  'completed',
  'failed'
);

create table public.knowledge_embed_jobs (
  id uuid primary key default gen_random_uuid(),
  status public.knowledge_embed_job_status not null default 'pending',
  article_ids uuid[] not null,
  articles_total int not null default 0,
  articles_processed int not null default 0,
  chunks_written int not null default 0,
  error text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index knowledge_embed_jobs_status_idx
  on public.knowledge_embed_jobs (status, created_at);

alter table public.knowledge_embed_jobs enable row level security;

create policy "Knowledge team can view embed jobs"
  on public.knowledge_embed_jobs for select
  using (public.can_view_knowledge_workspace());

create trigger knowledge_embed_jobs_updated_at
  before update on public.knowledge_embed_jobs
  for each row execute function public.set_updated_at();

-- Partner signup invites (validated server-side via service role)

create table public.partner_signup_invites (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  label text,
  email text,
  max_uses int not null default 1 check (max_uses > 0),
  uses_count int not null default 0 check (uses_count >= 0),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index partner_signup_invites_active_idx
  on public.partner_signup_invites (code_hash)
  where revoked_at is null;

alter table public.partner_signup_invites enable row level security;

-- No select/insert policies: only service role manages invites from server actions.
