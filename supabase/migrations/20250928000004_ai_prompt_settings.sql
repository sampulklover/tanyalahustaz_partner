-- Admin-editable AI system prompt.
--
-- Stored as a single "default" row. When empty, the app falls back to the
-- built-in prompt in lib/ai-prompt.ts.

create table if not exists public.ai_settings (
  id text primary key,
  system_prompt text,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_settings enable row level security;

-- Knowledge team can read the settings; only the service role writes them.
drop policy if exists "Knowledge team can view ai settings" on public.ai_settings;
create policy "Knowledge team can view ai settings"
  on public.ai_settings for select
  using (public.can_view_knowledge_workspace());

drop trigger if exists ai_settings_updated_at on public.ai_settings;
create trigger ai_settings_updated_at
  before update on public.ai_settings
  for each row execute function public.set_updated_at();
