-- Partner-owned knowledge base.
--
-- Until now the only per-partner AI customisation was free-text instructions
-- (profiles.prompt_instructions). This adds a private, per-partner file library:
-- a partner uploads documents (PDF/DOCX/TXT/MD), we extract the text, chunk it,
-- embed it, and inject the closest chunks into that partner's chat calls only.
--
-- Design choices:
--   * Separate tables from the global knowledge base (`knowledge_articles` /
--     `knowledge_chunks`). Keeping them apart means the shared RLS, the shared
--     hybrid-search RPC, and the admin sync paths stay untouched — and there is
--     no chance of a partner filter being forgotten and leaking one partner's
--     files into another's answers.
--   * Both tables are partner-scoped (partner_id) with RLS limited to the owner.
--   * Embeddings are 1536-dim to match `openai/text-embedding-3-small`, the same
--     model the global knowledge base uses (see lib/embeddings.ts).

create extension if not exists vector;

-- 1) One row per uploaded file. Tracks ingestion status plus the embedding
--    cost so partner billing and the dashboard can show what each file cost.
create table if not exists public.partner_knowledge_files (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references auth.users (id) on delete cascade,
  filename text not null,
  -- Lowercased extension, used only for display and type checks.
  file_type text not null default 'text',
  mime_type text,
  size_bytes bigint not null default 0,
  -- 'processing' -> 'ready' | 'failed'.
  status text not null default 'processing',
  error text,
  -- Short excerpt of the extracted text, for display only. The full text is NOT
  -- stored: the chunk rows below already hold it, so keeping the whole document
  -- here would double the storage for no retrieval benefit. If the embedding
  -- model is ever changed, text is re-derived from the chunks (or the partner
  -- re-uploads).
  preview text,
  chunk_count int not null default 0,
  -- Embedding usage for this file (charged to the partner's credit ledger).
  embed_model text,
  embed_prompt_tokens int not null default 0,
  embed_cost_usd numeric(14, 8) not null default 0,
  charged_cents integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists partner_knowledge_files_partner_idx
  on public.partner_knowledge_files (partner_id, created_at desc);

alter table public.partner_knowledge_files enable row level security;

-- Partners manage only their own files. Writes happen through the service role
-- in the ingestion pipeline too, but these policies let the portal read/delete.
drop policy if exists "Partners can view own knowledge files" on public.partner_knowledge_files;
create policy "Partners can view own knowledge files"
  on public.partner_knowledge_files for select
  using (auth.uid() = partner_id);

drop policy if exists "Partners can insert own knowledge files" on public.partner_knowledge_files;
create policy "Partners can insert own knowledge files"
  on public.partner_knowledge_files for insert
  with check (auth.uid() = partner_id);

drop policy if exists "Partners can delete own knowledge files" on public.partner_knowledge_files;
create policy "Partners can delete own knowledge files"
  on public.partner_knowledge_files for delete
  using (auth.uid() = partner_id);

drop trigger if exists partner_knowledge_files_updated_at on public.partner_knowledge_files;
create trigger partner_knowledge_files_updated_at
  before update on public.partner_knowledge_files
  for each row execute function public.set_updated_at();

-- 2) Partner-scoped chunks. Mirrors `knowledge_chunks` but carries partner_id
--    and a generated tsvector for hybrid (vector + full-text) retrieval.
create table if not exists public.partner_knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references auth.users (id) on delete cascade,
  file_id uuid not null references public.partner_knowledge_files (id) on delete cascade,
  filename text not null,
  chunk_index int not null,
  content text not null,
  embedding vector(1536),
  content_tsv tsvector generated always as (to_tsvector('simple', coalesce(content, ''))) stored,
  created_at timestamptz not null default now(),
  unique (file_id, chunk_index)
);

create index if not exists partner_knowledge_chunks_partner_idx
  on public.partner_knowledge_chunks (partner_id);

create index if not exists partner_knowledge_chunks_file_idx
  on public.partner_knowledge_chunks (file_id);

-- HNSW for the vector side, GIN for the full-text side.
create index if not exists partner_knowledge_chunks_embedding_idx
  on public.partner_knowledge_chunks using hnsw (embedding vector_cosine_ops);

create index if not exists partner_knowledge_chunks_content_tsv_idx
  on public.partner_knowledge_chunks using gin (content_tsv);

alter table public.partner_knowledge_chunks enable row level security;

drop policy if exists "Partners can view own knowledge chunks" on public.partner_knowledge_chunks;
create policy "Partners can view own knowledge chunks"
  on public.partner_knowledge_chunks for select
  using (auth.uid() = partner_id);

-- Chunks are written only by the ingestion pipeline (service role), so no
-- insert/update policies are needed for partners.

-- 3) Hybrid match, restricted to a single partner. Same RRF fusion as the
--    global `match_knowledge_chunks_hybrid`, but the partner_id is a required
--    argument so a caller can never retrieve across tenants.
create or replace function public.match_partner_knowledge_chunks_hybrid(
  query_embedding vector(1536),
  p_partner_id uuid,
  query_text text,
  match_count int default 6,
  similarity_threshold float default 0.35
)
returns table (
  id uuid,
  file_id uuid,
  filename text,
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
    from public.partner_knowledge_chunks kc
    where kc.partner_id = p_partner_id
      and kc.embedding is not null
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
    from public.partner_knowledge_chunks kc
    where kc.partner_id = p_partner_id
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
    kc.file_id,
    kc.filename,
    kc.content,
    case
      when query_embedding is not null then (1 - (kc.embedding <=> query_embedding))::float
      else 0
    end as similarity,
    f.keyword_rank,
    f.vector_rank,
    f.fused_score
  from fused f
  inner join public.partner_knowledge_chunks kc on kc.id = f.id
  order by f.fused_score desc
  limit match_count;
$$;
