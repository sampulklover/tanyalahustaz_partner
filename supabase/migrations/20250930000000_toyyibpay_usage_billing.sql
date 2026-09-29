-- ToyyibPay top-ups + usage-based billing with an admin-editable markup.
--
-- Replaces Stripe as the payment provider. Also adds:
--   * billing_settings          single-row markup configuration (min 30%)
--   * credit_ledger             append-only credit balance (top-ups + usage)
--   * partner_chat_logs columns token usage, cost, and the charge applied
--
-- Partner-facing charge for one chat:
--   cost_usd (from OpenRouter) x (1 + markup_percent/100) x usd_myr_rate

-- 1) Generalise billing_transactions for a second provider.
--    stripe_session_id stays for historical rows but is no longer required.
alter table public.billing_transactions
  alter column stripe_session_id drop not null;

alter table public.billing_transactions
  add column if not exists provider text not null default 'toyyibpay',
  add column if not exists provider_bill_code text,
  add column if not exists provider_ref_no text,
  add column if not exists provider_payment_id text,
  add column if not exists paid_at timestamptz;

create unique index if not exists billing_transactions_provider_bill_code_idx
  on public.billing_transactions (provider_bill_code)
  where provider_bill_code is not null;

-- 2) Billing settings — a single editable row.
--    markup_percent is constrained to at least 30% (the Tanyalah Ustaz minimum).
create table if not exists public.billing_settings (
  id text primary key,
  markup_percent numeric(6, 2) not null default 30,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_settings_markup_min check (markup_percent >= 30)
);

alter table public.billing_settings enable row level security;

drop policy if exists "Knowledge team can view billing settings" on public.billing_settings;
create policy "Knowledge team can view billing settings"
  on public.billing_settings for select
  using (public.can_view_knowledge_workspace());

drop trigger if exists billing_settings_updated_at on public.billing_settings;
create trigger billing_settings_updated_at
  before update on public.billing_settings
  for each row execute function public.set_updated_at();

insert into public.billing_settings (id, markup_percent)
values ('default', 30)
on conflict (id) do nothing;

-- 3) Cost accounting on each chat turn.
alter table public.partner_chat_logs
  add column if not exists prompt_tokens int,
  add column if not exists completion_tokens int,
  add column if not exists total_tokens int,
  add column if not exists cost_usd numeric(14, 8),
  add column if not exists usd_myr_rate numeric(10, 4),
  add column if not exists markup_percent numeric(6, 2),
  add column if not exists charged_cents integer;

-- 4) Credit ledger — balance is the sum of deltas.
--    Positive = top-up / refund, negative = usage charge.
create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  delta_cents integer not null,
  reason text not null,
  reference text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists credit_ledger_user_id_idx
  on public.credit_ledger (user_id, created_at desc);

-- One top-up credit per ToyyibPay bill, so retried callbacks are idempotent.
create unique index if not exists credit_ledger_topup_ref_idx
  on public.credit_ledger (reference)
  where reason = 'topup' and reference is not null;

alter table public.credit_ledger enable row level security;

drop policy if exists "Users can view own credit ledger" on public.credit_ledger;
create policy "Users can view own credit ledger"
  on public.credit_ledger for select
  using (auth.uid() = user_id);

-- Writes happen only with the service role (no insert/update/delete policies).

-- Fast balance lookup for the dashboard.
-- Runs as the caller: RLS limits partners to their own rows, while the service
-- role (server) sees the full balance. Not SECURITY DEFINER on purpose.
create or replace function public.get_credit_balance(p_user_id uuid)
returns integer
language sql
stable
as $$
  select coalesce(sum(delta_cents), 0)::integer
  from public.credit_ledger
  where user_id = p_user_id;
$$;
