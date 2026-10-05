-- supabase/customers-admin.sql
-- Admin command center, part 2: customers. Run after accounts-checkout.sql,
-- partners.sql, account-gate.sql and discount-codes.sql. Idempotent.
-- RLS on, no policies: service role only.

-- Blocked = full lockout (Supabase ban + this flag, checked by lib/dal.ts).
alter table customers add column if not exists blocked_at timestamptz;
alter table customers add column if not exists blocked_reason text;

-- What the owner did to an account, newest first on the customer page.
create table if not exists customer_events (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null references customers(id) on delete cascade,
  kind          text not null check (kind in ('blocked', 'unblocked', 'credit_added', 'credit_removed', 'verify_resent')),
  amount_cents  integer check (amount_cents is null or amount_cents > 0),
  reason        text,   -- block reason, or credit category (goodwill/seeding/correction/other)
  note          text,
  actor_id      uuid references customers(id),
  created_at    timestamptz not null default now()
);
create index if not exists customer_events_customer_idx on customer_events (customer_id, created_at desc);
alter table customer_events enable row level security;

-- Owner adjustments carry a note (the category lives on the event, ref_id → event id).
alter table store_credit_ledger add column if not exists note text;

-- Add (positive) or remove (negative) store credit. Same advisory-lock key as
-- spend_store_credit, so a removal and a checkout spend can't both pass the
-- balance check. Raises 'insufficient_credit' if the balance would go below 0.
create or replace function admin_adjust_credit(p_customer uuid, p_amount integer, p_category text, p_note text, p_actor uuid)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_bal bigint;
  v_event uuid;
begin
  if p_amount = 0 then raise exception 'zero_amount'; end if;
  perform pg_advisory_xact_lock(hashtext(p_customer::text));
  select coalesce(sum(amount_cents), 0) into v_bal from store_credit_ledger where customer_id = p_customer;
  if v_bal + p_amount < 0 then raise exception 'insufficient_credit'; end if;
  insert into customer_events (customer_id, kind, amount_cents, reason, note, actor_id)
    values (p_customer, case when p_amount > 0 then 'credit_added' else 'credit_removed' end, abs(p_amount), p_category, p_note, p_actor)
    returning id into v_event;
  insert into store_credit_ledger (customer_id, amount_cents, reason, ref_id, note)
    values (p_customer, p_amount, 'owner_adjust', v_event, p_note);
  return v_event;
end $$;

-- One page of the Customers list. Emails come from auth.users (not reachable
-- through the API). "Paid orders" = paid or shipped; "spent" = money paid
-- (total minus store credit used). p_q is pre-cleaned by the server (no % _ \).
create or replace function admin_customer_list(p_q text, p_tab text, p_limit integer, p_offset integer)
returns table (
  id uuid, email text, full_name text, organization text, is_owner boolean, created_at timestamptz,
  email_verified_at timestamptz, blocked_at timestamptz, is_partner boolean,
  paid_orders integer, spent_cents bigint, last_order_at timestamptz, credit_cents bigint, total_count bigint
) language sql stable security definer set search_path = public, pg_temp as $$
  with base as (
    select c.id, u.email::text as email, c.full_name, c.organization, c.is_owner, c.created_at, c.email_verified_at, c.blocked_at,
      exists (select 1 from partners p where p.customer_id = c.id) as is_partner,
      coalesce(o.n, 0)::integer as paid_orders, coalesce(o.spent, 0)::bigint as spent_cents, o.last_at as last_order_at,
      coalesce(l.bal, 0)::bigint as credit_cents
    from customers c
    join auth.users u on u.id = c.id
    left join lateral (
      select count(*) as n, sum(total_cents - store_credit_cents) as spent, max(created_at) as last_at
      from orders where customer_id = c.id and status in ('paid', 'shipped')
    ) o on true
    left join lateral (select sum(amount_cents) as bal from store_credit_ledger where customer_id = c.id) l on true
  )
  select b.*, count(*) over () as total_count
  from base b
  where (p_tab = 'all'
      or (p_tab = 'ordered' and b.paid_orders > 0)
      or (p_tab = 'none' and b.paid_orders = 0)
      or (p_tab = 'unverified' and b.email_verified_at is null)
      or (p_tab = 'blocked' and b.blocked_at is not null))
    and (coalesce(p_q, '') = ''
      or b.email ilike '%' || p_q || '%'
      or b.full_name ilike '%' || p_q || '%'
      or coalesce(b.organization, '') ilike '%' || p_q || '%'
      or b.id in (select customer_id from orders where order_number = upper(p_q)))
  order by b.created_at desc, b.id
  limit p_limit offset p_offset
$$;

-- The list's tiles and tab counts.
create or replace function admin_customer_stats() returns json
language sql stable security definer set search_path = public, pg_temp as $$
  with per as (
    select c.created_at, c.email_verified_at, c.blocked_at,
      (select count(*) from orders o where o.customer_id = c.id and o.status in ('paid', 'shipped')) as paid_orders,
      (select coalesce(sum(amount_cents), 0) from store_credit_ledger l where l.customer_id = c.id) as credit
    from customers c
  )
  select json_build_object(
    'total', count(*),
    'new_30d', count(*) filter (where created_at >= now() - interval '30 days'),
    'new_prior_30d', count(*) filter (where created_at >= now() - interval '60 days' and created_at < now() - interval '30 days'),
    'ordered', count(*) filter (where paid_orders > 0),
    'repeat', count(*) filter (where paid_orders >= 2),
    'unverified', count(*) filter (where email_verified_at is null),
    'blocked', count(*) filter (where blocked_at is not null),
    'credit_cents', coalesce(sum(credit) filter (where credit > 0), 0),
    'credit_accounts', count(*) filter (where credit > 0)
  ) from per
$$;

revoke all on function admin_adjust_credit(uuid, integer, text, text, uuid) from public, anon, authenticated;
revoke all on function admin_customer_list(text, text, integer, integer) from public, anon, authenticated;
revoke all on function admin_customer_stats() from public, anon, authenticated;
grant execute on function admin_adjust_credit(uuid, integer, text, text, uuid) to service_role;
grant execute on function admin_customer_list(text, text, integer, integer) to service_role;
grant execute on function admin_customer_stats() to service_role;
