-- Restrict direct knowledge access to the knowledge team only.
-- Partners consume knowledge via /api/v1/* (service role), not Supabase client reads.

drop policy if exists "Anyone authenticated can read published knowledge"
  on public.knowledge_articles;

drop policy if exists "Authenticated users can read knowledge chunks"
  on public.knowledge_chunks;
