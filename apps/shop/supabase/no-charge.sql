-- Part 9B: owner-created no-charge orders (spec 2026-10-06-admin-staff-logins-design.md).
-- Apply after staff.sql. Every money field is 0; order counts ignore kind <> 'sale'.

alter table orders add column if not exists kind text not null default 'sale';
alter table orders drop constraint if exists orders_kind_check;
alter table orders add constraint orders_kind_check check (kind in ('sale', 'no_charge'));
alter table orders add column if not exists retail_value_cents integer check (retail_value_cents >= 0);
alter table orders add column if not exists no_charge_reason text;
alter table orders drop constraint if exists orders_no_charge_reason_check;
alter table orders add constraint orders_no_charge_reason_check check (no_charge_reason is null or no_charge_reason in ('seeding', 'replacement', 'sample', 'other'));
alter table orders add column if not exists no_charge_note text;
alter table orders add column if not exists replaces_order_id uuid references orders(id);
alter table orders add column if not exists created_by uuid references customers(id) on delete set null;
alter table orders drop constraint if exists orders_no_charge_zero;
alter table orders add constraint orders_no_charge_zero check (kind = 'sale' or (
  subtotal_cents = 0 and shipping_cents = 0 and insurance_cents = 0 and tax_cents = 0 and total_cents = 0
  and store_credit_cents = 0 and partner_discount_cents = 0 and code_discount_cents = 0
  and partner_id is null and discount_code_id is null and stripe_session_id is null
  and no_charge_reason is not null and retail_value_cents is not null));
create index if not exists orders_kind_paid_idx on orders (kind, paid_at desc);
alter table order_items add column if not exists retail_unit_cents integer check (retail_unit_cents >= 0);

alter table admin_events drop constraint if exists admin_events_action_check;
alter table admin_events add constraint admin_events_action_check check (action in (
  'order_shipped', 'order_refunded',
  'partner_approved', 'partner_declined', 'partner_suspended', 'partner_reinstated',
  'payout_paid', 'w9_opened', 'w9_checked',
  'inquiries_seen',
  'staff_disabled', 'staff_enabled', 'staff_signed_out',
  'no_charge_created', 'no_charge_cancelled'));

-- The functions below are full copies of their latest definitions, changed
-- only where noted (each original carries a "superseded by no-charge.sql" line).

-- hold_vials (latest: catalog-ops.sql). A no-charge order may send a hidden
-- strength (samples before launch); archived or unknown strengths are still
-- refused. Everything else is unchanged.
create or replace function hold_vials(p_order uuid) returns json language plpgsql
set search_path = public, pg_temp as $$
declare
  v_status text;
  v_kind text;
  it record;
  lt record;
  lk record;
  need integer;
  take integer;
  shorts text[] := '{}';
begin
  select status, kind into v_status, v_kind from orders where id = p_order for update;
  if v_status is distinct from 'awaiting_payment' then return json_build_object('ok', false, 'reason', 'inactive'); end if;
  if exists (select 1 from lot_holds where order_id = p_order) then return json_build_object('ok', true); end if;
  if exists (select 1 from order_items i
             left join catalog_products p on p.slug = i.compound_slug
             left join catalog_variants v on v.slug = i.compound_slug and v.variant_id = i.variant_id
             where i.order_id = p_order and ((v_kind = 'sale' and (p.shown is not true or v.shown is not true)) or v.archived_at is not null or v.slug is null)) then
    return json_build_object('ok', false, 'reason', 'inactive');
  end if;
  for lk in select distinct compound_slug || ':' || variant_id as k
            from order_items where order_id = p_order order by 1 loop
    perform pg_advisory_xact_lock(hashtext('stock:' || lk.k));
  end loop;
  for it in select compound_slug, variant_id, sum(pack_qty * quantity)::int as need
            from order_items where order_id = p_order group by 1, 2 loop
    if coalesce((select sum(available) from lot_stock
                 where slug = it.compound_slug and variant_id = it.variant_id and status = 'live' and available > 0), 0) < it.need then
      shorts := shorts || (it.compound_slug || ':' || it.variant_id);
    end if;
  end loop;
  if array_length(shorts, 1) > 0 then
    return json_build_object('ok', false, 'reason', 'sold_out', 'short', to_json(shorts));
  end if;
  for it in select id, compound_slug, variant_id, pack_qty * quantity as need
            from order_items where order_id = p_order order by id loop
    need := it.need;
    for lt in select id, available from lot_stock
              where slug = it.compound_slug and variant_id = it.variant_id and status = 'live' and available > 0
              order by live_at, lot_number loop
      exit when need = 0;
      take := least(need, lt.available);
      insert into lot_holds (order_id, order_item_id, lot_id, qty) values (p_order, it.id, lt.id, take);
      need := need - take;
    end loop;
    if need > 0 then raise exception 'hold_vials: % vials of %:% left unheld on order %', need, it.compound_slug, it.variant_id, p_order; end if;
    update order_items set lot_number = (
      select string_agg(l.lot_number, ', ' order by l.live_at, l.lot_number)
      from lot_holds h join lots l on l.id = h.lot_id where h.order_item_id = it.id
    ) where id = it.id;
  end loop;
  return json_build_object('ok', true);
end $$;
revoke all on function hold_vials(uuid) from public, anon, authenticated;

-- admin_sales_summary (latest: today.sql): sales, first-time and refunds count sales only.
create or replace function admin_sales_summary(p_from timestamptz, p_to timestamptz, p_bucket text) returns json
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if p_bucket not in ('hour', 'day') then raise exception 'bad_bucket'; end if;
  return (
    with o as (
      select x.id, x.paid_at, x.subtotal_cents, x.tax_cents,
        x.subtotal_cents - x.partner_discount_cents as goods,
        x.total_cents - x.store_credit_cents as charged,
        x.shipping_cents + x.insurance_cents as shipping,
        not exists (select 1 from orders e where e.customer_id = x.customer_id and e.kind = 'sale' and e.paid_at < x.paid_at) as first_time
      from orders x
      where x.kind = 'sale' and x.status in ('paid', 'shipped') and x.paid_at >= p_from and x.paid_at < p_to),
    r as (
      select count(*) as n, coalesce(sum(total_cents), 0) as cents from orders
      where kind = 'sale' and status = 'refunded' and refunded_at >= p_from and refunded_at < p_to),
    b as (
      select to_char(date_trunc(p_bucket, o.paid_at at time zone 'America/Denver'), 'YYYY-MM-DD"T"HH24:MI') as at,
        sum(o.goods) as cents
      from o group by 1),
    t as (
      select i.compound_name as name, i.strength, sum(i.pack_qty * i.quantity) as vials,
        round(sum(i.line_total_cents::numeric * o.goods / nullif(o.subtotal_cents, 0)))::bigint as cents
      from order_items i join o on o.id = i.order_id
      group by i.compound_name, i.strength
      order by 4 desc nulls last, 3 desc
      limit 5)
    select json_build_object(
      'sales_cents', (select coalesce(sum(goods), 0) from o),
      'orders', (select count(*) from o),
      'charged_cents', (select coalesce(sum(charged), 0) from o),
      'shipping_cents', (select coalesce(sum(shipping), 0) from o),
      'tax_cents', (select coalesce(sum(tax_cents), 0) from o),
      'refunded_cents', (select cents from r),
      'refunded_orders', (select n from r),
      'first_time_orders', (select count(*) from o where first_time),
      'repeat_orders', (select count(*) from o where not first_time),
      'new_accounts', (select count(*) from customers c where c.created_at >= p_from and c.created_at < p_to),
      'buckets', coalesce((select json_agg(json_build_object('at', b.at, 'cents', b.cents) order by b.at) from b), '[]'::json),
      'top', coalesce((select json_agg(json_build_object('name', t.name, 'strength', t.strength, 'vials', t.vials, 'cents', t.cents)
                         order by t.cents desc nulls last, t.vials desc) from t), '[]'::json))
  );
end $$;
revoke all on function admin_sales_summary(timestamptz, timestamptz, text) from public, anon, authenticated;
grant execute on function admin_sales_summary(timestamptz, timestamptz, text) to service_role;

-- admin_customer_list (latest: customers-admin.sql): paid orders / spent count sales only.
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
      from orders where customer_id = c.id and status in ('paid', 'shipped') and kind = 'sale'
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
revoke all on function admin_customer_list(text, text, integer, integer) from public, anon, authenticated;
grant execute on function admin_customer_list(text, text, integer, integer) to service_role;

-- admin_customer_stats (latest: customers-admin.sql): ordered / repeat count sales only.
create or replace function admin_customer_stats() returns json
language sql stable security definer set search_path = public, pg_temp as $$
  with per as (
    select c.created_at, c.email_verified_at, c.blocked_at,
      (select count(*) from orders o where o.customer_id = c.id and o.status in ('paid', 'shipped') and o.kind = 'sale') as paid_orders,
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
revoke all on function admin_customer_stats() from public, anon, authenticated;
grant execute on function admin_customer_stats() to service_role;

-- discount_dashboard (latest: discount-codes.sql): store revenue and order count are sales only.
create or replace function discount_dashboard() returns json language sql stable
set search_path = public, pg_temp as $$
  select json_build_object(
    'uses_30d', (select count(*) from code_redemptions where state = 'used' and created_at > now() - interval '30 days'),
    'uses_prior_30d', (select count(*) from code_redemptions where state = 'used' and created_at <= now() - interval '30 days' and created_at > now() - interval '60 days'),
    'revenue_30d', (select coalesce(sum(o.subtotal_cents - o.partner_discount_cents), 0) from code_redemptions r join orders o on o.id = r.order_id
                    where r.state = 'used' and o.status in ('paid', 'shipped') and r.created_at > now() - interval '30 days'),
    'goods_revenue_30d', (select coalesce(sum(subtotal_cents - partner_discount_cents), 0) from orders where kind = 'sale' and status in ('paid', 'shipped') and paid_at > now() - interval '30 days'),
    'orders_30d', (select count(*) from orders where kind = 'sale' and status in ('paid', 'shipped') and paid_at > now() - interval '30 days'),
    'discount_30d', (select coalesce(sum(discount_cents), 0) from code_redemptions where state = 'used' and created_at > now() - interval '30 days'),
    'capped_30d', (select count(*) from code_redemptions where state = 'used' and capped_cents > 0 and created_at > now() - interval '30 days'),
    'trimmed_30d', (select coalesce(sum(capped_cents), 0) from code_redemptions where state = 'used' and created_at > now() - interval '30 days')
  )
$$;
revoke all on function discount_dashboard() from public, anon, authenticated;

-- email_audience (latest: email-admin.sql): a free order doesn't make someone a customer who has ordered.
create or replace function email_audience(p_audience text) returns table (email text)
language sql stable security definer set search_path = public, pg_temp as $$
  select s.email from subscribers s
  where s.status = 'confirmed'
    and not exists (
      select 1 from auth.users u join customers c on c.id = u.id
      where lower(u.email) = s.email and c.blocked_at is not null)
    and (
      p_audience = 'all'
      or (p_audience = 'ordered' and exists (
        select 1 from orders o where lower(o.email) = s.email and o.status in ('paid','processing','shipped','refunded') and o.kind = 'sale'))
      or (p_audience = 'never_ordered' and not exists (
        select 1 from orders o where lower(o.email) = s.email and o.status in ('paid','processing','shipped','refunded') and o.kind = 'sale')))
$$;
revoke all on function email_audience(text) from public, anon, authenticated;
grant execute on function email_audience(text) to service_role;

-- admin_email_attribution (latest: email-admin.sql): credits sales only.
create or replace function admin_email_attribution(p_since timestamptz, p_days integer)
returns table (kind text, ref text, orders bigint, revenue_cents bigint)
language sql stable security definer set search_path = public, pg_temp as $$
  with paid as (
    select o.id, lower(o.email) as email, o.paid_at, o.subtotal_cents - o.partner_discount_cents as goods
    from orders o
    where o.kind = 'sale' and o.status in ('paid','shipped') and o.paid_at is not null and o.paid_at >= p_since),
  credited as (
    select p.goods, x.kind, x.ref
    from paid p
    cross join lateral (
      select es.kind, case when es.kind = 'campaign' then es.ref end as ref
      from email_sends es
      where es.email = p.email and not es.skipped
        and (es.kind = 'campaign' or es.kind like 'welcome\_%')
        and coalesce(es.ref, '') not like 'test-%'
        and es.sent_at <= p.paid_at and es.sent_at > p.paid_at - make_interval(days => p_days)
      order by es.sent_at desc limit 1) x)
  select kind, ref, count(*), coalesce(sum(goods), 0) from credited group by kind, ref
$$;
revoke all on function admin_email_attribution(timestamptz, integer) from public, anon, authenticated;
grant execute on function admin_email_attribution(timestamptz, integer) to service_role;

-- admin_cart_recovery (latest: email-admin.sql): a later free order isn't a recovered cart.
create or replace function admin_cart_recovery(p_since timestamptz, p_hours integer) returns json
language sql stable security definer set search_path = public, pg_temp as $$
  with reminded as (
    select es.ref::uuid as order_id, min(es.sent_at) as first_sent, max(es.sent_at) as last_sent
    from email_sends es
    where es.kind like 'cart\_%' and not es.skipped and es.sent_at >= p_since
      and es.ref is not null and es.ref not like 'test-%'
    group by es.ref),
  rec as (
    select r.order_id, coalesce(
      (select o.subtotal_cents - o.partner_discount_cents from orders o
        where o.id = r.order_id and o.status in ('paid','shipped')),
      (select n.subtotal_cents - n.partner_discount_cents from orders o
        join orders n on n.customer_id = o.customer_id and n.id <> o.id
        where o.id = r.order_id and n.status in ('paid','shipped') and n.kind = 'sale'
          and n.paid_at > r.first_sent and n.paid_at <= r.last_sent + make_interval(hours => p_hours)
        order by n.paid_at limit 1)) as goods
    from reminded r)
  select json_build_object('reminded', count(*), 'recovered', count(goods), 'revenue_cents', coalesce(sum(goods), 0)) from rec
$$;
revoke all on function admin_cart_recovery(timestamptz, integer) from public, anon, authenticated;
grant execute on function admin_cart_recovery(timestamptz, integer) to service_role;
