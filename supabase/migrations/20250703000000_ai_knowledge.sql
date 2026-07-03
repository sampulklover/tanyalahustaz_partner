-- AI knowledge base + partner chat logs
-- Partners call /api/v1/chat; we enrich prompts with this knowledge and route to OpenRouter.

-- Platform-managed knowledge (Islamic content for AI context)
create table public.knowledge_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null default 'general',
  summary text not null,
  content text not null,
  tags text[] not null default '{}',
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index knowledge_articles_category_idx on public.knowledge_articles (category);
create index knowledge_articles_published_idx on public.knowledge_articles (published) where published = true;

alter table public.knowledge_articles enable row level security;

create policy "Anyone authenticated can read published knowledge"
  on public.knowledge_articles for select
  using (published = true);

-- Partner chat logs (written by API via service role)
create table public.partner_chat_logs (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references auth.users (id) on delete cascade,
  api_key_id uuid references public.api_keys (id) on delete set null,
  session_id text not null,
  user_message text not null,
  assistant_message text not null,
  model text not null,
  sources jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create index partner_chat_logs_partner_id_idx on public.partner_chat_logs (partner_id);
create index partner_chat_logs_session_id_idx on public.partner_chat_logs (session_id);
create index partner_chat_logs_created_at_idx on public.partner_chat_logs (created_at desc);

alter table public.partner_chat_logs enable row level security;

create policy "Partners can view own chat logs"
  on public.partner_chat_logs for select
  using (auth.uid() = partner_id);

create trigger knowledge_articles_updated_at
  before update on public.knowledge_articles
  for each row execute function public.set_updated_at();

-- Seed sample knowledge articles for development / demo
insert into public.knowledge_articles (slug, title, category, summary, content, tags) values
(
  'jamak-solat-musafir',
  'Combining Prayers While Traveling (Jamak)',
  'fiqh',
  'Guidance on combining (jamak) Dhuhr/Asr and Maghrib/Isha during travel according to common scholarly views.',
  'Travelers may combine Dhuhr with Asr, and Maghrib with Isha, by performing both at the time of the earlier or later prayer depending on the madhhab followed. Conditions typically include: (1) the journey meets the minimum travel distance recognized by the school of thought, (2) the intention for travel remains, and (3) the traveler does not intend permanent residence at the destination. Partners should advise users to follow their local scholars for specific rulings.',
  array['solat', 'travel', 'jamak', 'fiqh']
),
(
  'niat-solat',
  'Intention (Niat) in Prayer',
  'fiqh',
  'The role of intention before prayer and what partners should communicate to end users.',
  'Intention (niat) in salah is made in the heart before takbiratul ihram. It specifies which prayer is being performed and, where relevant, whether one is leading, following, or praying alone. The intention should not be spoken aloud as a fixed formula. Teaching materials should emphasize sincerity and clarity of purpose rather than rote phrases.',
  array['solat', 'niat', 'ibadah']
),
(
  'sedekah-asma',
  'Charity (Sedekah) Basics',
  'ibadah',
  'Foundational guidance on voluntary charity that can be surfaced in AI answers.',
  'Sedekah is voluntary charity given seeking Allah''s pleasure. It purifies wealth, helps those in need, and is encouraged at all times, especially in Ramadan. Partners integrating AI should avoid issuing fatwa on specific zakat calculations; direct users to qualified scholars for complex financial situations.',
  array['sedekah', 'zakat', 'charity']
);
