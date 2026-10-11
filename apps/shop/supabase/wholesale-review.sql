-- Wholesale buyer review (spec 2026-10-10-wholesale-buyer-review-design.md). Apply after
-- wholesale-runs.sql. Review is on the buyer: a buyer is unreviewed while
-- wholesale_reviewed_at is null; every paid deposit from an unreviewed buyer is listed
-- on Today and the run page. Never blocks a run.
-- Replaces the customer_events kind check: if wholesale-runs.sql or disputes.sql is
-- re-run, re-apply this file after them.

alter table customers add column if not exists wholesale_reviewed_at timestamptz;
alter table customers add column if not exists wholesale_reviewed_by uuid references customers(id);

alter table customer_events drop constraint if exists customer_events_kind_check;
alter table customer_events add constraint customer_events_kind_check check (kind in (
  'blocked', 'unblocked', 'credit_added', 'credit_removed', 'verify_resent',
  'warning_refunded', 'warning_watched', 'warning_closed', 'wholesale_on', 'wholesale_off',
  'wholesale_reviewed'));

-- Marks a buyer reviewed and logs it, in one transaction. Idempotent: a second call
-- returns 'already' and writes nothing. 'missing' = no such customer.
create or replace function admin_mark_wholesale_reviewed(p_customer uuid, p_actor uuid) returns text
language plpgsql set search_path = public, pg_temp as $$
begin
  update customers set wholesale_reviewed_at = now(), wholesale_reviewed_by = p_actor
    where id = p_customer and wholesale_reviewed_at is null;
  if not found then
    if exists (select 1 from customers where id = p_customer) then return 'already'; end if;
    return 'missing';
  end if;
  insert into customer_events (customer_id, kind, actor_id) values (p_customer, 'wholesale_reviewed', p_actor);
  return 'ok';
end $$;
revoke all on function admin_mark_wholesale_reviewed(uuid, uuid) from public, anon, authenticated;

-- Paid deposits (deposit_paid) from buyers not yet reviewed, earliest order-by first.
-- order_items.quantity on a wholesale order is kits.
create or replace function admin_unreviewed_wholesale_buyers()
returns table (order_id uuid, order_number text, customer_id uuid, full_name text, organization text,
               email text, research_field text, deposit_cents integer, kits integer, cutoff_on date)
language sql stable set search_path = public, pg_temp as $$
  select o.id, o.order_number, o.customer_id, c.full_name, c.organization, o.email, c.research_field,
         o.deposit_cents, coalesce((select sum(i.quantity) from order_items i where i.order_id = o.id), 0)::integer,
         o.wholesale_cutoff_on
  from orders o join customers c on c.id = o.customer_id
  where o.channel = 'wholesale' and o.status = 'deposit_paid' and o.kind = 'sale' and c.wholesale_reviewed_at is null
  order by o.wholesale_cutoff_on, o.created_at
$$;
revoke all on function admin_unreviewed_wholesale_buyers() from public, anon, authenticated;

-- Backfill (pre-launch): everyone who already turned wholesale on is a test account.
update customers
  set wholesale_reviewed_at = now(),
      wholesale_reviewed_by = (select customer_id from staff where role = 'owner' and status = 'active' limit 1)
  where wholesale_enabled_at is not null and wholesale_reviewed_at is null;
