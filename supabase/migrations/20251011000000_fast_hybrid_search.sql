-- Speed up match_knowledge_chunks_hybrid for large corpora (100k+ chunks).
--
-- Problem: the original keyword branch ranked EVERY row matching the tsquery
-- across the whole table (861k chunks locally). For a common word that is
-- hundreds of thousands of rows to sort, which blows past the statement timeout
-- and makes the app return "no context" for answerable questions.
--
-- Fix: keep each branch bounded and materialized, and fuse by a plain UNION ALL
-- scored in one place. This mirrors a hand-written query that runs in ~20ms on
-- 860k chunks, versus ~8s for the previous multi-CTE/websearch form.

create or replace function public.match_knowledge_chunks_hybrid(
  query_embedding vector,
  query_text text,
  match_count integer default 6,
  filter_category text default null,
  similarity_threshold double precision default 0.35
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
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
  with vector_hits as (
    select kc.id
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
    select kc.id
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
  candidates as (
    select v.id as id, 1 as v_hit, 0 as k_hit from vector_hits v
    union all
    select k.id, 0, 1 from keyword_hits k
  ),
  scored as (
    select
      c.id,
      sum(c.v_hit) as v_hit,
      sum(c.k_hit) as k_hit,
      sum(c.v_hit + c.k_hit)::float as fused_score
    from candidates c
    group by c.id
  )
  select
    kc.id,
    kc.article_id,
    ka.slug as article_slug,
    ka.title as article_title,
    ka.category,
    kc.content,
    (1 - (kc.embedding <=> query_embedding))::float as similarity,
    nullif(s.k_hit, 0) as keyword_rank,
    nullif(s.v_hit, 0) as vector_rank,
    s.fused_score
  from scored s
  inner join public.knowledge_chunks kc on kc.id = s.id
  inner join public.knowledge_articles ka on ka.id = kc.article_id
  order by s.fused_score desc, kc.embedding <=> query_embedding asc
  limit match_count;
end;
$$;
