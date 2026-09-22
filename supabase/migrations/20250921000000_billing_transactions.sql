-- Stripe top-ups recorded from webhooks. Users can read their own rows;
-- writes happen with the service role from /api/stripe/webhook.
create table if not exists public.billing_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  stripe_session_id text not null unique,
  stripe_payment_intent_id text,
  amount_cents integer not null,
  currency text not null default 'myr',
  status text not null default 'pending',
  payment_method text,
  receipt_url text,
  created_at timestamptz not null default now()
);

create index if not exists billing_transactions_user_id_idx
  on public.billing_transactions (user_id, created_at desc);

alter table public.billing_transactions enable row level security;

create policy "Users can view own billing transactions"
  on public.billing_transactions for select
  using (auth.uid() = user_id);
