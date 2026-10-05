-- Semantic answer cache.
--
-- Repeat and near-duplicate questions are common (greetings, FAQs). Caching the
-- answer keyed by the question embedding lets us skip retrieval and the LLM
-- entirely for those, which is the biggest latency win available.
--
-- The cache stores only the assistant reply and its cited sources. It is
-- scoped per partner so one tenant's answers never leak into another's. Rows
-- expire via `expires_at` and are cleared whenever the knowledge base changes.

create table if not exists public.chat_answer_cache (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references auth.users (id) on delete cascade,
  -- Normalised question used for an exact-match lookup (fast path).
  question_norm text not null,
  question text not null,
  -- Optional category filter the answer was produced under.
  category text,
  embedding vector(1536) not null,
  answer text not null,
  sources jsonb not null default '[]'::jsonb,
  hits int not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

create index if not exists chat_answer_cache_partner_idx
  on public.chat_answer_cache (partner_id, question_norm);

create index if not exists chat_answer_cache_embedding_idx
  on public.chat_answer_cache using hnsw (embedding vector_cosine_ops);

create index if not exists chat_answer_cache_expiry_idx
  on public.chat_answer_cache (expires_at);

alter table public.chat_answer_cache enable row level security;

-- Look up a cached answer by question embedding, restricted to one partner and
-- non-expired rows. Returns the closest match above the threshold, or nothing.
create or replace function public.match_chat_answer(
  query_embedding vector(1536),
  p_partner_id uuid,
  similarity_threshold float default 0.95
)
returns table (
  id uuid,
  answer text,
  sources jsonb,
  similarity float
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.answer,
    c.sources,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.chat_answer_cache c
  where c.partner_id = p_partner_id
    and c.expires_at > now()
    and 1 - (c.embedding <=> query_embedding) >= similarity_threshold
  order by c.embedding <=> query_embedding
  limit 1;
$$;
