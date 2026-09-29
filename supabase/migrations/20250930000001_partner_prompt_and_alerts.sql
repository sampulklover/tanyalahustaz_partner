-- Per-partner prompt customisation + low-credit email alerts.
--
-- Partners (API owners) can append their own instructions on top of the
-- knowledge-admin prompt, and set a credit threshold that triggers an email
-- when their balance drops to or below it.

alter table public.profiles
  add column if not exists prompt_instructions text,
  add column if not exists low_balance_threshold_cents integer,
  add column if not exists low_balance_alerted_at timestamptz;

-- Keep the threshold non-negative when it is set.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_low_balance_threshold_nonnegative'
  ) then
    alter table public.profiles
      add constraint profiles_low_balance_threshold_nonnegative
      check (low_balance_threshold_cents is null or low_balance_threshold_cents >= 0);
  end if;
end $$;

-- "Users can update own profile" (from the initial schema) already lets a
-- partner write their own prompt + threshold; alert timestamps are written
-- server-side with the service role.
