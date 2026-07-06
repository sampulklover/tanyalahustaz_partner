-- Upgrade: 1536-dim → 2048-dim for nvidia/llama-nemotron-embed-vl-1b-v2:free
--
-- Run this in Supabase SQL Editor if you already ran:
--   20250706000000_vector_rag.sql (with vector(1536))
--
-- Note: pgvector HNSW indexes support max 2000 dimensions, so 2048-dim
-- vectors use exact search (no index). Fine until you have many thousands of chunks.
--
-- After this migration, run locally:
--   npm run embed-knowledge

-- Remove old vector index if it exists (may fail on 1536 setup — that's ok)
drop index if exists public.knowledge_chunks_embedding_idx;

-- 1536-dim vectors cannot be reused
truncate table public.knowledge_chunks;

-- Replace embedding column with 2048-dim
alter table public.knowledge_chunks drop column if exists embedding;
alter table public.knowledge_chunks add column embedding vector(2048);

-- Drop old 1536-dim function signature if it exists
drop function if exists public.match_knowledge_chunks(vector(1536), int, text, float);

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
