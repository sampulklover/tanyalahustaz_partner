-- Switch embeddings: 2048-dim (NVIDIA free) → 1536-dim (openai/text-embedding-3-small)
--
-- ⚠️  WARNING: this TRUNCATES knowledge_chunks. Only run it when switching the
--     embedding model. Never re-run it after embeddings exist (you would delete
--     them and have to re-embed everything again).
--
-- Vectors from different models cannot be mixed, so this truncates the chunk
-- table and rebuilds the search function at 1536 dimensions.
--
-- After running this in the Supabase SQL Editor:
--   1. Set OPENROUTER_EMBEDDING_MODEL=openai/text-embedding-3-small
--   2. Run locally: npm run embed-knowledge

-- Old vectors are not compatible with the new model.
drop index if exists public.knowledge_chunks_embedding_idx;
truncate table public.knowledge_chunks;

-- Replace the embedding column with 1536-dim.
alter table public.knowledge_chunks drop column if exists embedding;
alter table public.knowledge_chunks add column embedding vector(1536);

-- Drop the old 2048-dim function signature.
drop function if exists public.match_knowledge_chunks(vector(2048), int, text, float);

create or replace function public.match_knowledge_chunks(
  query_embedding vector(1536),
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

-- 1536 dimensions is within pgvector's 2000-dim index limit, so we can now use
-- an approximate (HNSW) index for faster semantic search.
create index if not exists knowledge_chunks_embedding_idx
  on public.knowledge_chunks
  using hnsw (embedding vector_cosine_ops);
