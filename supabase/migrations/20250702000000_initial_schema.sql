-- Partner API platform schema

create extension if not exists "pgcrypto";

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  company_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- API keys (hashed; full key shown only once at creation)
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text not null unique,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index api_keys_user_id_idx on public.api_keys (user_id);
create index api_keys_key_hash_idx on public.api_keys (key_hash) where revoked_at is null;

alter table public.api_keys enable row level security;

create policy "Users can view own api keys"
  on public.api_keys for select
  using (auth.uid() = user_id);

create policy "Users can create own api keys"
  on public.api_keys for insert
  with check (auth.uid() = user_id);

create policy "Users can update own api keys"
  on public.api_keys for update
  using (auth.uid() = user_id);

-- Usage logging (written by service role from API routes)
create table public.api_usage (
  id bigserial primary key,
  api_key_id uuid references public.api_keys (id) on delete set null,
  endpoint text not null,
  method text not null,
  status_code int,
  created_at timestamptz not null default now()
);

create index api_usage_api_key_id_idx on public.api_usage (api_key_id);
create index api_usage_created_at_idx on public.api_usage (created_at desc);

alter table public.api_usage enable row level security;

create policy "Users can view usage for own keys"
  on public.api_usage for select
  using (
    exists (
      select 1 from public.api_keys
      where api_keys.id = api_usage.api_key_id
        and api_keys.user_id = auth.uid()
    )
  );

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Updated_at trigger for profiles
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
