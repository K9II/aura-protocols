-- supabase/discount-codes.sql
-- Admin command center, part 1: discount codes. Run after partners.sql and
-- account-gate.sql. Idempotent. RLS on, no policies: service role only.

create table if not exists discount_batches (
  id          uuid primary key default gen_random_uuid(),
  prefix      text not null,
  size        integer not null check (size between 1 and 5000),
  note        text,
  created_by  uuid references customers(id),
  created_at  timestamptz not null default now()
);
alter table discount_batches enable row level security;

create table if not exists discount_codes (
  id                 uuid primary key default gen_random_uuid(),
  code               text not null unique check (code ~ '^[A-Z0-9][A-Z0-9-]{1,22}[A-Z0-9]$'),
  note               text,
  kind               text not null check (kind in ('item_pct', 'order_pct', 'order_amount', 'ship_only')),
  value              integer not null default 0 check (value >= 0),  -- percent, or cents for order_amount
  stack_on_top       boolean not null default false,
  free_shipping      boolean not null default false,
  starts_at          timestamptz,
  ends_at            timestamptz,
  max_uses           integer check (max_uses is null or max_uses >= 1),
  once_per_customer  boolean not null default false,
  locked_email       text,
  min_order_cents    integer check (min_order_cents is null or min_order_cents >= 0),
  include_slugs      text[] not null default '{}',
  exclude_slugs      text[] not null default '{}',
  include_classes    text[] not null default '{}',
  exclude_classes    text[] not null default '{}',
  status             text not null default 'active' check (status in ('active', 'paused', 'ended')),
  batch_id           uuid references discount_batches(id),
  created_by         uuid references customers(id),
  created_at         timestamptz not null default now(),
  check ((kind in ('item_pct', 'order_pct') and value between 1 and 100) or (kind = 'order_amount' and value >= 1) or kind = 'ship_only'),
  check (kind <> 'ship_only' or not free_shipping)  -- ship_only already means free shipping
);
create index if not exists discount_codes_batch_idx on discount_codes (batch_id);
alter table discount_codes enable row level security;

create table if not exists code_redemptions (
  id             uuid primary key default gen_random_uuid(),
  code_id        uuid not null references discount_codes(id),
  order_id       uuid not null unique references orders(id),
  customer_id    uuid not null references customers(id),
  discount_cents integer not null default 0,
  capped_cents   integer not null default 0,
  state          text not null default 'held' check (state in ('held', 'used', 'released', 'reset')),
  created_at     timestamptz not null default now(),
  settled_at     timestamptz
);
create index if not exists code_redemptions_code_idx on code_redemptions (code_id, state);
create index if not exists code_redemptions_customer_idx on code_redemptions (customer_id, state);
alter table code_redemptions enable row level security;

create table if not exists discount_code_events (
  id        bigserial primary key,
  code_id   uuid references discount_codes(id),
  batch_id  uuid references discount_batches(id),
  kind      text not null,   -- created | edited | paused | resumed | ended | use_reset | cap_changed
  detail    text,
  actor     uuid references customers(id),
  at        timestamptz not null default now()
);
create index if not exists discount_code_events_code_idx on discount_code_events (code_id, at desc);
create index if not exists discount_code_events_batch_idx on discount_code_events (batch_id, at desc);
alter table discount_code_events enable row level security;

-- Failed code tries, for the 10-per-10-minutes limit (per account and per network).
create table if not exists code_attempts (
  id           bigserial primary key,
  customer_id  uuid not null,
  ip_hash      text not null,
  at           timestamptz not null default now()
);
create index if not exists code_attempts_customer_idx on code_attempts (customer_id, at);
create index if not exists code_attempts_ip_idx on code_attempts (ip_hash, at);
alter table code_attempts enable row level security;

create table if not exists shop_settings (
  id                boolean primary key default true check (id),
  max_discount_pct  integer not null default 30 check (max_discount_pct between 15 and 60)  -- never below the new-account 15%,
  updated_at        timestamptz not null default now()
);
alter table shop_settings enable row level security;
insert into shop_settings (id, max_discount_pct) values (true, 30) on conflict do nothing;

alter table orders add column if not exists discount_code_id uuid references discount_codes(id);
alter table orders add column if not exists code_discount_cents integer not null default 0 check (code_discount_cents >= 0);

-- One namespace with partner codes: a discount code may not reuse a partner's
-- current or old code. (The partner side checks discount_codes in isCodeTaken.)
create or replace function discount_code_namespace() returns trigger language plpgsql
set search_path = public, pg_temp as $$
begin
  if exists (select 1 from partners where code = new.code) or exists (select 1 from partner_code_aliases where code = new.code) then
    raise exception 'code % is a partner code', new.code using errcode = '23505';
  end if;
  return new;
end $$;
drop trigger if exists discount_code_namespace on discount_codes;
create trigger discount_code_namespace before insert or update of code on discount_codes
  for each row execute function discount_code_namespace();

-- Claims one use for a pending order. Returns 'ok' | 'missing' | 'inactive' |
-- 'used_up' | 'already_used'. Idempotent per order and code. Only an order
-- still awaiting payment can claim (locking its row also orders the claim
-- against a concurrent cancel). The code row lock serialises the last use;
-- the per-customer lock serialises once-per-customer across a batch.
create or replace function claim_discount_code(p_code uuid, p_order uuid, p_customer uuid, p_discount integer, p_capped integer)
returns text language plpgsql
set search_path = public, pg_temp as $$
declare
  c discount_codes%rowtype;
  n integer;
  v_status text;
begin
  perform pg_advisory_xact_lock(hashtext('discount-customer:' || p_customer::text));
  select status into v_status from orders where id = p_order for update;
  select * into c from discount_codes where id = p_code for update;
  if not found then return 'missing'; end if;
  if exists (select 1 from code_redemptions where order_id = p_order and code_id = p_code and state in ('held', 'used')) then return 'ok'; end if;
  if v_status is distinct from 'awaiting_payment' then return 'inactive'; end if;
  if c.status <> 'active' or (c.starts_at is not null and c.starts_at > now()) or (c.ends_at is not null and c.ends_at <= now()) then
    return 'inactive';
  end if;
  if c.max_uses is not null then
    select count(*) into n from code_redemptions where code_id = p_code and state in ('held', 'used');
    if n >= c.max_uses then return 'used_up'; end if;
  end if;
  if c.once_per_customer then
    select count(*) into n from code_redemptions r join discount_codes d on d.id = r.code_id
      where r.customer_id = p_customer and r.state in ('held', 'used')
        and (d.id = p_code or (c.batch_id is not null and d.batch_id = c.batch_id));
    if n > 0 then return 'already_used'; end if;
  end if;
  insert into code_redemptions (code_id, order_id, customer_id, discount_cents, capped_cents, state)
    values (p_code, p_order, p_customer, p_discount, p_capped, 'held');
  return 'ok';
end $$;
revoke all on function claim_discount_code(uuid, uuid, uuid, integer, integer) from public, anon, authenticated;

-- Settles a held use on every path, with no application code: payment marks
-- it used; a cancel (checkout failure, expiry, reconcile cron, a newer
-- checkout) releases it. 'processing' (ACH pending) keeps it held. A refund
-- keeps it used; the owner can reset it.
create or replace function settle_code_on_order_status() returns trigger language plpgsql
set search_path = public, pg_temp as $$
begin
  if new.status = old.status then return new; end if;
  if new.status in ('paid', 'shipped') then
    update code_redemptions set state = 'used', settled_at = now() where order_id = new.id and state = 'held';
  elsif new.status = 'cancelled' then
    update code_redemptions set state = 'released', settled_at = now() where order_id = new.id and state = 'held';
  end if;
  return new;
end $$;
drop trigger if exists settle_code_on_order_status on orders;
create trigger settle_code_on_order_status after update of status on orders
  for each row execute function settle_code_on_order_status();

create or replace view discount_code_stats with (security_invoker = true) as
select c.id as code_id,
  count(r.id) filter (where r.state = 'used') as uses,
  count(r.id) filter (where r.state = 'held') as held,
  coalesce(sum(o.subtotal_cents - o.partner_discount_cents) filter (where r.state = 'used' and o.status in ('paid', 'shipped')), 0) as revenue_cents,
  coalesce(sum(r.discount_cents) filter (where r.state = 'used'), 0) as discount_cents,
  count(r.id) filter (where r.state = 'used' and r.capped_cents > 0) as capped_orders
from discount_codes c
left join code_redemptions r on r.code_id = c.id
left join orders o on o.id = r.order_id
group by c.id;
revoke all on discount_code_stats from public, anon, authenticated;

create or replace function discount_dashboard() returns json language sql stable
set search_path = public, pg_temp as $$
  select json_build_object(
    'uses_30d', (select count(*) from code_redemptions where state = 'used' and created_at > now() - interval '30 days'),
    'uses_prior_30d', (select count(*) from code_redemptions where state = 'used' and created_at <= now() - interval '30 days' and created_at > now() - interval '60 days'),
    'revenue_30d', (select coalesce(sum(o.subtotal_cents - o.partner_discount_cents), 0) from code_redemptions r join orders o on o.id = r.order_id
                    where r.state = 'used' and o.status in ('paid', 'shipped') and r.created_at > now() - interval '30 days'),
    'goods_revenue_30d', (select coalesce(sum(subtotal_cents - partner_discount_cents), 0) from orders where status in ('paid', 'shipped') and paid_at > now() - interval '30 days'),
    'orders_30d', (select count(*) from orders where status in ('paid', 'shipped') and paid_at > now() - interval '30 days'),
    'discount_30d', (select coalesce(sum(discount_cents), 0) from code_redemptions where state = 'used' and created_at > now() - interval '30 days'),
    'capped_30d', (select count(*) from code_redemptions where state = 'used' and capped_cents > 0 and created_at > now() - interval '30 days'),
    'trimmed_30d', (select coalesce(sum(capped_cents), 0) from code_redemptions where state = 'used' and created_at > now() - interval '30 days')
  )
$$;
revoke all on function discount_dashboard() from public, anon, authenticated;
