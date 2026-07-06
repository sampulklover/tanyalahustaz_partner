-- Platform admins can manage the knowledge base (partners cannot)

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

create index if not exists profiles_is_admin_idx on public.profiles (is_admin) where is_admin = true;

-- Admins: full access to knowledge_articles (including unpublished)
create policy "Admins can view all knowledge articles"
  on public.knowledge_articles for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

create policy "Admins can insert knowledge articles"
  on public.knowledge_articles for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

create policy "Admins can update knowledge articles"
  on public.knowledge_articles for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

create policy "Admins can delete knowledge articles"
  on public.knowledge_articles for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

create policy "Admins can read all knowledge chunks"
  on public.knowledge_chunks for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

-- Make your first admin (replace email):
-- update public.profiles set is_admin = true where email = 'you@example.com';
