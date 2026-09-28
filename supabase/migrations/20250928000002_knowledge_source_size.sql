-- Record the source file size for mirrored articles so admins can see it.

alter table public.knowledge_articles
  add column if not exists source_size bigint;
