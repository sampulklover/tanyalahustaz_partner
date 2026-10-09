-- Trim redundant metadata from knowledge_chunks.
--
-- Each chunk row used to carry its own copy of `article_slug`, `article_title`,
-- and `category` — data already stored once on `knowledge_articles`. With tens
-- of thousands of chunks that is a meaningful amount of duplicated text for no
-- retrieval benefit: the hybrid search already joins `knowledge_articles`.
--
-- This drops the three columns and rebuilds `match_knowledge_chunks_hybrid` to
-- read them from the joined article instead. The function's return shape is
-- unchanged, so callers (lib/knowledge.ts) need no edits.

-- 1) Rebuild the RPC first, so nothing references the columns when they go.
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
      and (filter_category is null or ka.category = filter_category)
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
      and (filter_category is null or ka.category = filter_category)
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
    ka.slug as article_slug,
    ka.title as article_title,
    ka.category,
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
  inner join public.knowledge_articles ka on ka.id = kc.article_id
  order by f.fused_score desc
  limit match_count;
$$;

-- 2) The redundant per-chunk metadata.
alter table public.knowledge_chunks
  drop column if exists article_slug,
  drop column if exists article_title,
  drop column if exists category;
