-- Track the OpenRouter embedding cost of mirroring each knowledge file.
--
-- OpenRouter returns `usage.cost` (USD credits) on every embeddings request.
-- We store the total for each article so admins can see how much a file cost
-- to make searchable, and the totals on the sync run / embed job for the whole
-- batch. Files mirrored before this migration have NULL cost until re-embedded.

alter table public.knowledge_articles
  add column if not exists embed_cost_usd numeric(14, 8),
  add column if not exists embed_prompt_tokens int,
  add column if not exists embed_chunks int,
  add column if not exists embed_model text,
  add column if not exists embed_updated_at timestamptz;

comment on column public.knowledge_articles.embed_cost_usd is
  'Total OpenRouter cost in USD to embed this article''s chunks.';
comment on column public.knowledge_articles.embed_prompt_tokens is
  'Prompt tokens sent to the embedding model across all chunks.';
comment on column public.knowledge_articles.embed_chunks is
  'How many chunk embeddings were written for this article.';
comment on column public.knowledge_articles.embed_model is
  'Embedding model used, e.g. openai/text-embedding-3-small.';

-- Cost totals on the embed job, so the activity panel can show a batch total.
alter table public.knowledge_embed_jobs
  add column if not exists embed_cost_usd numeric(14, 8) not null default 0,
  add column if not exists embed_prompt_tokens bigint not null default 0;

-- Cost totals on the sync run, so the history shows what a sync cost to embed.
alter table public.knowledge_sync_runs
  add column if not exists embed_cost_usd numeric(14, 8) not null default 0,
  add column if not exists embed_prompt_tokens bigint not null default 0;
