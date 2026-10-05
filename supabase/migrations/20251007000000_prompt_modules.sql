-- Admin-editable specialty prompt modules.
--
-- The assistant prompt is composed from a shared base (ai_settings.system_prompt)
-- plus one or more specialty modules chosen per question. This column stores
-- per-module overrides as a JSON object: { "<moduleId>": "<prompt text>" }.
-- A missing key or empty string means "use the built-in module from
-- lib/prompts/modules.ts", so the code constants remain the fallback.

alter table public.ai_settings
  add column if not exists module_prompts jsonb not null default '{}'::jsonb;

-- Keep the column an object (not an array/scalar) so lookups stay simple.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ai_settings_module_prompts_is_object'
  ) then
    alter table public.ai_settings
      add constraint ai_settings_module_prompts_is_object
      check (jsonb_typeof(module_prompts) = 'object');
  end if;
end $$;
