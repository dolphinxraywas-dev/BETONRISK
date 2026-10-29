-- NBA — Take the Throne: starter schema for Supabase/Postgres.
-- Apply only after reviewing in a development project. This does not configure secrets or Edge Functions.
create extension if not exists pgcrypto;

create table if not exists public.players (
  telegram_id bigint primary key,
  username text,
  display_name text not null default 'Player',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.wallets (
  telegram_id bigint primary key references public.players(telegram_id) on delete cascade,
  demo_balance bigint not null default 100 check (demo_balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.token_ledger (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint not null references public.players(telegram_id),
  amount bigint not null check (amount <> 0),
  reason text not null check (reason in ('demo_grant','round_entry','round_reward','admin_adjustment','reversal')),
  idempotency_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.game_rounds (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint not null references public.players(telegram_id),
  selected_numbers smallint[] not null check (cardinality(selected_numbers)=2),
  dice_results smallint[] not null check (cardinality(dice_results)=6),
  match_count smallint not null check (match_count between 0 and 6),
  demo_cost bigint not null default 10 check (demo_cost >= 0),
  demo_reward bigint not null default 0 check (demo_reward >= 0),
  created_at timestamptz not null default now(),
  constraint selected_numbers_valid check (selected_numbers <@ array[1,2,3,4,5,6]::smallint[]),
  constraint dice_results_valid check (dice_results <@ array[1,2,3,4,5,6]::smallint[])
);

create table if not exists public.token_requests (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint not null references public.players(telegram_id),
  pack_size bigint not null check (pack_size in (100,500,1000)),
  status text not null default 'demo' check (status in ('demo','pending','approved','rejected','cancelled')),
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by bigint
);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_telegram_id bigint not null,
  action text not null,
  target_telegram_id bigint,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Default-deny client access. Edge Functions with server-side secrets should perform writes.
alter table public.players enable row level security;
alter table public.wallets enable row level security;
alter table public.token_ledger enable row level security;
alter table public.game_rounds enable row level security;
alter table public.token_requests enable row level security;
alter table public.admin_audit_log enable row level security;

-- Intentionally no client policies are created here. Add narrowly scoped SELECT policies only
-- after choosing an authentication model. Never expose service_role to a browser.
-- The service role bypasses RLS; validate Telegram initData, admin allowlist, input, and rate limits
-- in every Edge Function before using it.
