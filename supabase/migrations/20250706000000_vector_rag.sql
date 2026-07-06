-- Vector RAG: chunked embeddings for semantic knowledge search

create extension if not exists vector;

create table public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.knowledge_articles (id) on delete cascade,
  article_slug text not null,
  article_title text not null,
  category text not null,
  chunk_index int not null,
  content text not null,
  embedding vector(2048),
  created_at timestamptz not null default now(),
  unique (article_id, chunk_index)
);

create index knowledge_chunks_article_id_idx on public.knowledge_chunks (article_id);
create index knowledge_chunks_category_idx on public.knowledge_chunks (category);

-- Note: pgvector HNSW/IVFFlat indexes max out at 2000 dimensions.
-- NVIDIA embeddings are 2048-dim, so we use exact search (no vector index).
-- Fine for small/medium knowledge bases; add an index if you switch to a <=2000-dim model.

alter table public.knowledge_chunks enable row level security;

create policy "Authenticated users can read knowledge chunks"
  on public.knowledge_chunks for select
  using (
    exists (
      select 1 from public.knowledge_articles ka
      where ka.id = knowledge_chunks.article_id
        and ka.published = true
    )
  );

create or replace function public.match_knowledge_chunks(
  query_embedding vector(2048),
  match_count int default 6,
  filter_category text default null,
  similarity_threshold float default 0.25
)
returns table (
  id uuid,
  article_id uuid,
  article_slug text,
  article_title text,
  category text,
  content text,
  similarity float
)
language sql
stable
security definer
set search_path = public
as $$
  select
    kc.id,
    kc.article_id,
    kc.article_slug,
    kc.article_title,
    kc.category,
    kc.content,
    (1 - (kc.embedding <=> query_embedding))::float as similarity
  from public.knowledge_chunks kc
  inner join public.knowledge_articles ka on ka.id = kc.article_id
  where kc.embedding is not null
    and ka.published = true
    and (filter_category is null or kc.category = filter_category)
    and (1 - (kc.embedding <=> query_embedding)) >= similarity_threshold
  order by kc.embedding <=> query_embedding
  limit match_count;
$$;

create index partner_chat_logs_session_partner_idx
  on public.partner_chat_logs (partner_id, session_id, created_at);
