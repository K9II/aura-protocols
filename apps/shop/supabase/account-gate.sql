-- supabase/account-gate.sql — account gate (2026-10-04). Run after
-- accounts-checkout.sql and email.sql. RLS on, no policies: only the service
-- role (server) reads or writes these tables.

-- Our own email verification. Supabase "Confirm email" is OFF, so sign-up
-- signs the visitor straight in and Supabase marks every address confirmed;
-- whether the address is really verified lives here.
alter table customers add column if not exists email_verified_at timestamptz;
alter table customers add column if not exists verify_required boolean not null default false;
alter table customers add column if not exists verify_token_hash text;
alter table customers add column if not exists verify_sent_at timestamptz;
alter table customers add column if not exists marketing_opt_in boolean not null default false;
create unique index if not exists customers_verify_token_idx on customers (verify_token_hash) where verify_token_hash is not null;

-- Accounts that verified under Supabase's own link stay verified. Only users
-- created before the switch: once "Confirm email" is OFF every new auth user
-- has email_confirmed_at set, so re-running this must not verify them.
update customers c set email_verified_at = u.email_confirmed_at
  from auth.users u
  where u.id = c.id and c.email_verified_at is null and u.email_confirmed_at is not null
    and u.created_at < '2026-10-05';

-- The automatic new-account 15% (no code): which orders got it.
alter table orders add column if not exists new_account_discount boolean not null default false;

-- Email-check rate limit for POST /api/gate/lookup: one row per lookup.
create table if not exists gate_lookups (
  id       bigserial primary key,
  ip_hash  text not null,
  at       timestamptz not null default now()
);
create index if not exists gate_lookups_ip_at_idx on gate_lookups (ip_hash, at);
alter table gate_lookups enable row level security;

-- Sign-ups per IP in 24 h (fake-email defence) are counted from agreements.
create index if not exists account_agreements_ip_idx on account_agreements (ip_hash, agreed_at);

-- auth.users isn't reachable through the API; the server asks through this.
create or replace function public.account_id_by_email(p_email text) returns uuid
  language sql stable security definer set search_path = '' as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1
$$;
revoke all on function public.account_id_by_email(text) from public, anon, authenticated;
grant execute on function public.account_id_by_email(text) to service_role;
