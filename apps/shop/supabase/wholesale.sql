-- Wholesale, made-to-order 10-vial kits — Part 1 (spec 2026-10-08-wholesale-kits-design.md).
-- Apply after refunds.sql. RLS on, no policies: service role, server only.

-- Order statuses: two wholesale-only states (retail never uses them).
alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check check (status in
  ('awaiting_payment','processing','deposit_paid','balance_due','paid','shipped','cancelled','refunded'));

alter table orders add column if not exists channel text not null default 'retail';
alter table orders drop constraint if exists orders_channel_check;
alter table orders add constraint orders_channel_check check (channel in ('retail','wholesale'));
alter table orders add column if not exists wholesale_cutoff_on date;          -- the production run this order joins
alter table orders add column if not exists deposit_cents integer check (deposit_cents is null or deposit_cents > 0);
alter table orders add column if not exists balance_cents integer check (balance_cents is null or balance_cents >= 0);
alter table orders add column if not exists deposit_payment_intent text;
alter table orders add column if not exists balance_payment_intent text;
alter table orders add column if not exists balance_session_id text;
alter table orders add column if not exists balance_due_at timestamptz;
alter table orders add column if not exists deposit_paid_at timestamptz;
alter table orders drop constraint if exists orders_wholesale_shape_check;
alter table orders add constraint orders_wholesale_shape_check check (
  channel = 'retail' or (deposit_cents is not null and balance_cents is not null and wholesale_cutoff_on is not null and partner_id is null));
create index if not exists orders_channel_status_idx on orders (channel, status, created_at desc);
create index if not exists orders_deposit_pi_idx on orders (deposit_payment_intent) where deposit_payment_intent is not null;
create index if not exists orders_balance_pi_idx on orders (balance_payment_intent) where balance_payment_intent is not null;

-- Per-strength switch (Admin → Catalog in Part 2). On by default.
alter table catalog_variants add column if not exists wholesale boolean not null default true;
-- Off at launch: supplier cost too close to list price for kit pricing (2026-10-08 margin review).
update catalog_variants set wholesale = false where slug in ('igf-1-lr3', 'glutathione', 'pinealon', 'epithalon');

-- Self-serve wholesale: on when the customer accepts the terms; the owner can switch it off.
alter table customers add column if not exists wholesale_enabled_at timestamptz;
alter table customers add column if not exists wholesale_disabled_at timestamptz;
alter table customers add column if not exists wholesale_disabled_reason text;

create table if not exists wholesale_agreements (
  id             uuid primary key default gen_random_uuid(),
  customer_id    uuid not null references customers(id) on delete cascade,
  terms_version  text not null,
  ip_hash        text,
  user_agent     text,
  agreed_at      timestamptz not null default now()
);
create index if not exists wholesale_agreements_customer_idx on wholesale_agreements (customer_id, agreed_at desc);
alter table wholesale_agreements enable row level security;

-- Settings (owner-editable in Part 2). Tiers: [{minKits, pct}] ascending, the first
-- starting at wholesale_min_kits; the app validates them. Pricing (2026-10-10): minimum
-- 5 kits; 5-9 25%, 10-19 30%, 20+ 35% (was 20/25/30 on 2026-10-08). Each batch's lot test
-- is absorbed in the price.
alter table shop_settings add column if not exists wholesale_open boolean not null default false;
alter table shop_settings add column if not exists wholesale_tiers jsonb not null
  default '[{"minKits":5,"pct":25},{"minKits":10,"pct":30},{"minKits":20,"pct":35}]';
alter table shop_settings add column if not exists wholesale_min_kits integer not null default 5 check (wholesale_min_kits between 1 and 50);
alter table shop_settings add column if not exists wholesale_deposit_pct integer not null default 40 check (wholesale_deposit_pct between 10 and 90);
alter table shop_settings add column if not exists wholesale_balance_days integer not null default 7 check (wholesale_balance_days between 1 and 30);
alter table shop_settings add column if not exists wholesale_run_days integer not null default 14 check (wholesale_run_days between 7 and 56);
alter table shop_settings add column if not exists wholesale_lead_days integer not null default 28 check (wholesale_lead_days between 7 and 90);
alter table shop_settings add column if not exists wholesale_next_cutoff date;   -- owner override; null = computed from the anchor
