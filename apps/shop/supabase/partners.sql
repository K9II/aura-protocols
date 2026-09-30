-- Partner (affiliate) program (2026-09-29). Apply in Aura Store AFTER
-- accounts-checkout.sql. Service role only: RLS on, no policies.

create table if not exists partners (
  id                     uuid primary key default gen_random_uuid(),
  customer_id            uuid not null unique references customers(id) on delete cascade,
  status                 text not null default 'applied' check (status in ('applied','approved','declined','suspended')),
  partner_type           text not null check (partner_type in (
                           'academic_researcher','industry_researcher','research_group','clinician','pharmacist','educator',
                           'publisher','video_creator','podcaster','social_creator','community_host')),
  code                   text not null unique check (code ~ '^[A-Z0-9]{3,20}$'),
  lifetime_cents         bigint not null default 0 check (lifetime_cents >= 0),
  tier_pct               integer not null default 10 check (tier_pct in (10, 15, 20)),
  payout_pref            text not null default 'cash' check (payout_pref in ('cash','credit','split')),
  split_cash_pct         integer not null default 50 check (split_cash_pct between 0 and 100),
  cash_carry_cents       integer not null default 0,
  payout_method          text check (payout_method in ('ach','zelle')),
  payout_details_enc     text,
  payout_details_hint    text,
  w9_path                text,
  w9_uploaded_at         timestamptz,
  w9_checked_at          timestamptz,
  application            jsonb not null default '{}'::jsonb,
  approved_at            timestamptz,
  declined_at            timestamptz,
  suspended_at           timestamptz,
  created_at             timestamptz not null default now()
);
create index if not exists partners_status_idx on partners (status, created_at desc);
alter table partners enable row level security;

create table if not exists partner_agreements (
  id          uuid primary key default gen_random_uuid(),
  partner_id  uuid not null references partners(id) on delete cascade,
  version     text not null,
  ip_hash     text,
  user_agent  text,
  agreed_at   timestamptz not null default now()
);
alter table partner_agreements enable row level security;

-- Codes a partner used before changing theirs; they keep crediting that partner.
create table if not exists partner_code_aliases (
  code        text primary key check (code ~ '^[A-Z0-9]{3,20}$'),
  partner_id  uuid not null references partners(id) on delete cascade,
  created_at  timestamptz not null default now()
);
alter table partner_code_aliases enable row level security;

create table if not exists partner_clicks_daily (
  partner_id  uuid not null references partners(id) on delete cascade,
  day         date not null,
  clicks      integer not null default 0,
  primary key (partner_id, day)
);
alter table partner_clicks_daily enable row level security;

alter table orders add column if not exists partner_id uuid references partners(id);
alter table orders add column if not exists attributed_by text check (attributed_by in ('code','link'));
alter table orders add column if not exists partner_discount_cents integer not null default 0 check (partner_discount_cents >= 0);
alter table orders add column if not exists store_credit_cents integer not null default 0 check (store_credit_cents >= 0);
alter table orders add column if not exists stripe_coupon_id text;
alter table orders add column if not exists tax_calculation_id text;
create index if not exists orders_partner_idx on orders (partner_id, created_at desc);

create table if not exists payout_runs (
  run_date     date primary key,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  error        text
);
alter table payout_runs enable row level security;

create table if not exists commissions (
  id             uuid primary key default gen_random_uuid(),
  partner_id     uuid not null references partners(id),
  order_id       uuid not null unique references orders(id),
  attributed_by  text not null check (attributed_by in ('code','link')),
  base_cents     integer not null check (base_cents >= 0),
  rate_pct       integer not null check (rate_pct in (10, 15, 20)),
  amount_cents   integer not null check (amount_cents >= 0),
  state          text not null default 'pending' check (state in ('pending','clearing','payable','paid','void')),
  clears_at      timestamptz,
  payable_at     timestamptz,
  paid_at        timestamptz,
  voided_at      timestamptz,
  payout_run     date references payout_runs(run_date),
  created_at     timestamptz not null default now()
);
create index if not exists commissions_partner_idx on commissions (partner_id, created_at desc);
create index if not exists commissions_state_idx on commissions (state, clears_at);
alter table commissions enable row level security;

create table if not exists commission_adjustments (
  id            uuid primary key default gen_random_uuid(),
  partner_id    uuid not null references partners(id),
  order_id      uuid not null references orders(id),
  amount_cents  integer not null check (amount_cents < 0),
  reason        text not null,
  settled_run   date references payout_runs(run_date),
  created_at    timestamptz not null default now(),
  unique (order_id, reason)
);
alter table commission_adjustments enable row level security;

create table if not exists payouts (
  id            uuid primary key default gen_random_uuid(),
  partner_id    uuid not null references partners(id),
  run_date      date not null references payout_runs(run_date),
  cash_cents    integer not null default 0 check (cash_cents >= 0),
  credit_cents  integer not null default 0 check (credit_cents >= 0),
  status        text not null check (status in ('queued','paid','credited')),
  method        text,
  reference     text,
  paid_at       timestamptz,
  created_at    timestamptz not null default now(),
  unique (partner_id, run_date)
);
alter table payouts enable row level security;

create table if not exists store_credit_ledger (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null references customers(id) on delete cascade,
  amount_cents  integer not null check (amount_cents <> 0),
  reason        text not null check (reason in ('payout','order_spend','order_refund','owner_adjust')),
  ref_id        uuid,
  created_at    timestamptz not null default now()
);
create index if not exists store_credit_ledger_customer_idx on store_credit_ledger (customer_id);
create unique index if not exists store_credit_ledger_order_once on store_credit_ledger (reason, ref_id)
  where reason in ('order_spend','order_refund','payout');
alter table store_credit_ledger enable row level security;

-- One click per call, bucketed by UTC day.
create or replace function record_partner_click(p_partner uuid) returns void language sql as $$
  insert into partner_clicks_daily (partner_id, day, clicks) values (p_partner, (now() at time zone 'utc')::date, 1)
  on conflict (partner_id, day) do update set clicks = partner_clicks_daily.clicks + 1;
$$;

-- Adds (or subtracts) referred sales; the tier can only go up.
create or replace function adjust_partner_lifetime(p_partner uuid, p_delta bigint) returns integer language plpgsql as $$
declare
  new_total bigint;
  new_tier integer;
begin
  select greatest(0, lifetime_cents + p_delta) into new_total from partners where id = p_partner for update;
  if new_total is null then raise exception 'partner % not found', p_partner; end if;
  new_tier := case
    when new_total >= 4000000 then 20
    when new_total >= 1500000 then 15
    else 10 end;
  update partners set lifetime_cents = new_total, tier_pct = greatest(tier_pct, new_tier) where id = p_partner
    returning tier_pct into new_tier;
  return new_tier;
end $$;

-- Debits store credit for an order once; false if the balance is too low.
create or replace function spend_store_credit(p_customer uuid, p_cents integer, p_order uuid) returns boolean language plpgsql as $$
declare
  bal bigint;
begin
  perform pg_advisory_xact_lock(hashtext(p_customer::text));
  if exists (select 1 from store_credit_ledger where reason = 'order_spend' and ref_id = p_order) then return true; end if;
  select coalesce(sum(amount_cents), 0) into bal from store_credit_ledger where customer_id = p_customer;
  if bal < p_cents then return false; end if;
  insert into store_credit_ledger (customer_id, amount_cents, reason, ref_id) values (p_customer, -p_cents, 'order_spend', p_order);
  return true;
end $$;

revoke all on function record_partner_click(uuid) from public, anon, authenticated;
revoke all on function adjust_partner_lifetime(uuid, bigint) from public, anon, authenticated;
revoke all on function spend_store_credit(uuid, integer, uuid) from public, anon, authenticated;

-- Private bucket for W-9 PDFs (owner reads through 60-second signed URLs).
insert into storage.buckets (id, name, public) values ('w9', 'w9', false) on conflict (id) do nothing;
