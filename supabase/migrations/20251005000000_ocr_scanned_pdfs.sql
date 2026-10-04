-- OCR for scanned/image PDFs.
--
-- Some mirrored PDFs are scans with no text layer. `unpdf` extracts almost
-- nothing from them, so instead of failing the sync we flag them here. An
-- editor can then run OCR on demand (OpenRouter vision model), and the text is
-- written back onto the article before it is embedded.

-- Per-article OCR state.
alter table public.knowledge_articles
  add column if not exists ocr_status text,
  add column if not exists ocr_cost_usd numeric(14, 8),
  add column if not exists ocr_updated_at timestamptz;

comment on column public.knowledge_articles.ocr_status is
  'NULL = not a scanned file, pending = needs OCR, done = OCR applied, failed = OCR failed.';
comment on column public.knowledge_articles.ocr_cost_usd is
  'Total OpenRouter cost in USD to OCR this article''s pages.';

-- Only indexed rows need attention, so index the two actionable states.
create index if not exists knowledge_articles_ocr_pending_idx
  on public.knowledge_articles (ocr_status)
  where ocr_status in ('pending', 'failed');

-- Per-OCR-run cost totals, mirroring the sync/embed run tables.
create table if not exists public.knowledge_ocr_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'running',
  created_by uuid references auth.users (id) on delete set null,
  files_seen int not null default 0,
  processed_count int not null default 0,
  failed jsonb not null default '[]'::jsonb,
  ocr_cost_usd numeric(14, 8) not null default 0,
  ocr_prompt_tokens bigint not null default 0,
  ocr_completion_tokens bigint not null default 0,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists knowledge_ocr_runs_started_idx
  on public.knowledge_ocr_runs (started_at desc);

alter table public.knowledge_ocr_runs enable row level security;

create policy "Knowledge team can read OCR runs"
  on public.knowledge_ocr_runs for select
  using (public.can_view_knowledge_workspace());
