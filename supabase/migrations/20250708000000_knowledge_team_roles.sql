-- Assignable roles for staff who manage the shared knowledge base.
-- Admins can invite colleagues as Admin, Editor, or Viewer.

create type public.knowledge_team_role as enum ('admin', 'editor', 'viewer');

create table public.knowledge_team_members (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  role public.knowledge_team_role not null,
  granted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index knowledge_team_members_role_idx on public.knowledge_team_members (role);

alter table public.knowledge_team_members enable row level security;

create trigger knowledge_team_members_updated_at
  before update on public.knowledge_team_members
  for each row execute function public.set_updated_at();

-- Role helpers (security definer so RLS policies can use them)
create or replace function public.get_knowledge_team_role()
returns public.knowledge_team_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.knowledge_team_members where user_id = auth.uid();
$$;

create or replace function public.can_view_knowledge_workspace()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.get_knowledge_team_role() is not null;
$$;

create or replace function public.can_edit_knowledge()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.get_knowledge_team_role() in ('admin', 'editor');
$$;

create or replace function public.can_manage_knowledge_team()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.get_knowledge_team_role() = 'admin';
$$;

-- Migrate legacy is_admin users to team admins
insert into public.knowledge_team_members (user_id, role)
select id, 'admin'::public.knowledge_team_role
from public.profiles
where is_admin = true
on conflict (user_id) do nothing;

-- Prevent partners from self-promoting via profiles.is_admin
create or replace function public.protect_is_admin_column()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin then
    if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
      new.is_admin := old.is_admin;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_is_admin on public.profiles;
create trigger profiles_protect_is_admin
  before update on public.profiles
  for each row execute function public.protect_is_admin_column();

-- Replace is_admin-based knowledge policies with role-based policies
drop policy if exists "Admins can view all knowledge articles" on public.knowledge_articles;
drop policy if exists "Admins can insert knowledge articles" on public.knowledge_articles;
drop policy if exists "Admins can update knowledge articles" on public.knowledge_articles;
drop policy if exists "Admins can delete knowledge articles" on public.knowledge_articles;
drop policy if exists "Admins can read all knowledge chunks" on public.knowledge_chunks;

create policy "Knowledge team can view all articles"
  on public.knowledge_articles for select
  using (public.can_view_knowledge_workspace());

create policy "Knowledge editors can insert articles"
  on public.knowledge_articles for insert
  with check (public.can_edit_knowledge());

create policy "Knowledge editors can update articles"
  on public.knowledge_articles for update
  using (public.can_edit_knowledge());

create policy "Knowledge editors can delete articles"
  on public.knowledge_articles for delete
  using (public.can_edit_knowledge());

create policy "Knowledge team can read all chunks"
  on public.knowledge_chunks for select
  using (public.can_view_knowledge_workspace());

-- Team membership management
create policy "Knowledge team can view own membership"
  on public.knowledge_team_members for select
  using (user_id = auth.uid());

create policy "Knowledge admins can view all team members"
  on public.knowledge_team_members for select
  using (public.can_manage_knowledge_team());

create policy "Knowledge admins can add team members"
  on public.knowledge_team_members for insert
  with check (public.can_manage_knowledge_team());

create policy "Knowledge admins can update team members"
  on public.knowledge_team_members for update
  using (public.can_manage_knowledge_team());

create policy "Knowledge admins can remove team members"
  on public.knowledge_team_members for delete
  using (public.can_manage_knowledge_team());

-- Admins need to look up accounts by email when inviting colleagues
create policy "Knowledge admins can view profiles for team management"
  on public.profiles for select
  using (public.can_manage_knowledge_team());

-- Bootstrap first team admin (replace email), or promote via SQL Editor:
-- insert into public.knowledge_team_members (user_id, role)
-- select id, 'admin' from public.profiles where email = 'you@example.com';
