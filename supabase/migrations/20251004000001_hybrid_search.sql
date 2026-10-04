-- Hybrid retrieval: Postgres full-text search + pgvector cosine similarity.
--
-- Replaces the ad-hoc keyword grounding (hand-written stop words + ILIKE scans)
-- with proper, indexed full-text search. `simple` config (not `english`) so
-- Malay and Arabic-transliterated text is tokenised without English stemming.
--
-- The search function merges two ranked lists with Reciprocal Rank Fusion (RRF),
-- which needs no score calibration between the two very different scales.

-- Generated tsvector column, kept in sync automatically on insert/update.
alter table public.knowledge_chunks
  add column if not exists content_tsv tsvector
  generated always as (to_tsvector('simple', coalesce(content, ''))) stored;

create index if not exists knowledge_chunks_content_tsv_idx
  on public.knowledge_chunks using gin (content_tsv);

-- The old vector-only function is superseded by the hybrid one above.
drop function if exists public.match_knowledge_chunks(vector(1536), int, text, float);

-- Hybrid match: vector similarity + full-text, fused with RRF.
--
--   query_embedding   the question's vector
--   query_text        the raw question (for full-text matching)
--   match_count       how many chunks to return
--   filter_category   optional category filter
--   similarity_threshold  minimum cosine similarity for the vector side
--
-- RRF score = 1/(k + rank) summed across both lists; k = 60 is the usual
-- default from the original RRF paper.
create or replace function public.match_knowledge_chunks_hybrid(
  query_embedding vector(1536),
  query_text text,
  match_count int default 6,
  filter_category text default null,
  similarity_threshold float default 0.35
)
returns table (
  id uuid,
  article_id uuid,
  article_slug text,
  article_title text,
  category text,
  content text,
  similarity float,
  keyword_rank int,
  vector_rank int,
  fused_score float
)
language sql
stable
security definer
set search_path = public
as $$
  with vector_hits as (
    select
      kc.id,
      row_number() over (order by kc.embedding <=> query_embedding) as rank
    from public.knowledge_chunks kc
    inner join public.knowledge_articles ka on ka.id = kc.article_id
    where kc.embedding is not null
      and ka.published = true
      and (filter_category is null or kc.category = filter_category)
      and (1 - (kc.embedding <=> query_embedding)) >= similarity_threshold
    order by kc.embedding <=> query_embedding
    limit greatest(match_count * 4, 40)
  ),
  keyword_hits as (
    select
      kc.id,
      row_number() over (
        order by ts_rank_cd(kc.content_tsv, websearch_to_tsquery('simple', query_text)) desc
      ) as rank
    from public.knowledge_chunks kc
    inner join public.knowledge_articles ka on ka.id = kc.article_id
    where ka.published = true
      and (filter_category is null or kc.category = filter_category)
      and query_text is not null
      and query_text <> ''
      and kc.content_tsv @@ websearch_to_tsquery('simple', query_text)
    order by ts_rank_cd(kc.content_tsv, websearch_to_tsquery('simple', query_text)) desc
    limit greatest(match_count * 4, 40)
  ),
  fused as (
    select
      coalesce(v.id, k.id) as id,
      (coalesce(1.0 / (60 + v.rank), 0) + coalesce(1.0 / (60 + k.rank), 0)) as fused_score,
      v.rank as vector_rank,
      k.rank as keyword_rank
    from vector_hits v
    full outer join keyword_hits k on k.id = v.id
  )
  select
    kc.id,
    kc.article_id,
    kc.article_slug,
    kc.article_title,
    kc.category,
    kc.content,
    case
      when query_embedding is not null then (1 - (kc.embedding <=> query_embedding))::float
      else 0
    end as similarity,
    f.keyword_rank,
    f.vector_rank,
    f.fused_score
  from fused f
  inner join public.knowledge_chunks kc on kc.id = f.id
  order by f.fused_score desc
  limit match_count;
$$;
