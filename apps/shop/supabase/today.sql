-- supabase/today.sql
-- Admin command center, part 5: Today. Stored owner alerts (lib/notify.ts
-- alertOwner writes one row per open problem), the sales summary behind the
-- Numbers card, and the inquiries "seen" mark.
-- Run after accounts-checkout.sql, storefront.sql, discount-codes.sql
-- (shop_settings) and catalog-ops.sql. Idempotent. RLS on, no policies:
-- service role only.

create table if not exists owner_alerts (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(title) between 1 and 200),
  detail       text not null default '',
  count        integer not null default 1 check (count >= 1),
  first_at     timestamptz not null default now(),
  last_at      timestamptz not null default now(),
  resolved_at  timestamptz,
  resolved_by  uuid references customers(id) on delete set null,
  note         text
);
-- One open alert per title: the same problem again counts up instead of adding a row.
create unique index if not exists owner_alerts_open_title on owner_alerts (title) where resolved_at is null;
create index if not exists owner_alerts_last_idx on owner_alerts (last_at desc);
alter table owner_alerts enable row level security;
revoke all on owner_alerts from anon, authenticated;

alter table shop_settings add column if not exists inquiries_seen_at timestamptz;

-- Today reads these on every admin page load (the nav count) — keep them indexed.
create index if not exists inquiries_created_idx on inquiries (created_at desc);
create index if not exists orders_paid_at_idx on orders (paid_at) where paid_at is not null;
create index if not exists orders_refunded_at_idx on orders (refunded_at) where refunded_at is not null;
create index if not exists customers_created_idx on customers (created_at);

-- Insert, or count up the open alert with this title (atomic: the partial
-- unique index above is the conflict target). The newest detail goes on top;
-- earlier ones stay underneath, capped — unless it's the same detail again.
create or replace function record_owner_alert(p_title text, p_detail text) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid;
begin
  insert into owner_alerts as a (title, detail) values (p_title, left(coalesce(p_detail, ''), 4000))
  on conflict (title) where resolved_at is null do update set
    count = a.count + 1,
    last_at = now(),
    detail = case when split_part(a.detail, E'

— earlier —
', 1) = excluded.detail then a.detail
                  else left(excluded.detail || E'\n\n— earlier —\n' || a.detail, 4000) end
  returning id into v_id;
  return v_id;
end $$;

-- The Numbers card. Sales = goods after discounts (subtotal − every discount
-- beyond pack price: the commission base) of orders paid in [p_from, p_to)
-- that are still paid or shipped. Charged = what cards/banks paid (store
-- credit is a payment, not a charge). Buckets are Mountain-time hours or days
-- as local 'YYYY-MM-DDTHH:MI' keys (empty buckets left out; the app fills
-- them). Top 5 strengths share each order's goods by line total.
-- superseded by no-charge.sql
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
        not exists (select 1 from orders e where e.customer_id = x.customer_id and e.paid_at < x.paid_at) as first_time
      from orders x
      where x.status in ('paid', 'shipped') and x.paid_at >= p_from and x.paid_at < p_to),
    r as (
      select count(*) as n, coalesce(sum(total_cents), 0) as cents from orders
      where status = 'refunded' and refunded_at >= p_from and refunded_at < p_to),
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

revoke all on function record_owner_alert(text, text) from public, anon, authenticated;
revoke all on function admin_sales_summary(timestamptz, timestamptz, text) from public, anon, authenticated;
grant execute on function record_owner_alert(text, text) to service_role;
grant execute on function admin_sales_summary(timestamptz, timestamptz, text) to service_role;
