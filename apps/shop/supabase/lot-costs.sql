-- Lot costs and real profit per order (apply after wholesale-runs.sql and
-- supplier-prices.sql). Business-private: RLS on, no policies; functions are
-- server-only (service role).

-- What a lot cost: the supplier and the total paid for its boxes, plus its lab
-- test fee. Set when the lot is received (Catalog → Receive lot, pre-filled
-- from supplier_prices and shop_settings.lot_test_cents) or, for a wholesale
-- run, copied from the run line when the lot is linked. Null = not recorded.
alter table lots add column if not exists supplier text check (supplier is null or length(trim(supplier)) between 1 and 80);
alter table lots add column if not exists cost_cents integer check (cost_cents is null or cost_cents >= 0);
alter table lots add column if not exists test_cents integer check (test_cents is null or test_cents >= 0);
-- Landed cost beyond the supplier invoice: inbound freight + customs for the
-- lot, and the labels printed for its vials (pre-filled from AIOS rates).
alter table lots add column if not exists freight_cents integer check (freight_cents is null or freight_cents >= 0);
alter table lots add column if not exists label_cents integer check (label_cents is null or label_cents >= 0);

-- Receive lot's pre-filled lab fee (synced from the AIOS default lab).
alter table shop_settings add column if not exists lot_test_cents integer not null default 25000 check (lot_test_cents between 0 and 1000000);
-- Receive lot's other pre-fills (AIOS defaults china_inbound_per_kit, label_print_per_vial).
alter table shop_settings add column if not exists inbound_per_box_cents integer not null default 1500 check (inbound_per_box_cents between 0 and 100000);
alter table shop_settings add column if not exists label_per_vial_cents integer not null default 40 check (label_per_vial_cents between 0 and 10000);
-- Wholesale: each kit ships in a branded Aura Protocols box (AIOS defaults
-- kit_box_per_kit). A wholesale order records its box cost when it's placed,
-- so a later price change doesn't rewrite old orders' profit.
alter table shop_settings add column if not exists wholesale_kit_box_cents integer not null default 450 check (wholesale_kit_box_cents between 0 and 10000);
alter table orders add column if not exists packaging_cents integer check (packaging_cents is null or packaging_cents >= 0);

-- The actual Stripe fee of each payment, read from its balance transaction
-- when the payment lands (lib/payment-fees.ts). One row per payment.
create table if not exists payment_fees (
  order_id     uuid not null references orders(id) on delete cascade,
  payment      text not null check (payment in ('order', 'deposit', 'balance')),
  fee_cents    integer not null check (fee_cents >= 0),
  recorded_at  timestamptz not null default now(),
  primary key (order_id, payment)
);
alter table payment_fees enable row level security;

-- Profit rows for orders: one order by id, or every paid/shipped sale paid in
-- [p_from, p_to). Goods = subtotal − discounts (Today's Sales). Product,
-- freight, labels and lab cost = vials held/sold × the lot's cost per sellable vial. Card fee =
-- recorded fees, plus an estimate (2.9% + 30¢) for any payment not recorded.
-- Commission = the partner commission unless void.
-- (Dropped first: its columns changed when freight and labels were added.)
drop function if exists admin_profit_summary(timestamptz, timestamptz);
drop function if exists order_profit_rows(timestamptz, timestamptz, uuid);
create or replace function order_profit_rows(p_from timestamptz, p_to timestamptz, p_order uuid)
returns table (
  order_id uuid, goods_cents bigint, product_cents bigint, freight_cents bigint, label_cents bigint, test_cents bigint,
  packaging_cents bigint, fee_cents bigint, fee_estimated boolean, commission_cents bigint, vials bigint, vials_costed bigint
) language sql stable security definer set search_path = public, pg_temp as $$
  with o as (
    select x.* from orders x
    where (p_order is not null and x.id = p_order)
       or (p_order is null and x.kind = 'sale' and x.status in ('paid', 'shipped') and x.paid_at >= p_from and x.paid_at < p_to)
  ),
  pays as (
    -- the payments each order should have, with the amount each charged
    select o.id, 'order'::text as payment, greatest(o.total_cents - o.store_credit_cents, 0) as amount
      from o where o.channel <> 'wholesale' and o.kind = 'sale'
    union all
    select o.id, 'deposit', coalesce(o.deposit_cents, 0) from o where o.channel = 'wholesale'
    union all
    select o.id, 'balance', greatest(o.total_cents - coalesce(o.deposit_cents, 0), 0) from o
      where o.channel = 'wholesale' and o.status in ('paid', 'shipped', 'refunded')
  ),
  fees as (
    select p.id,
      sum(coalesce(f.fee_cents, case when p.amount > 0 then round(p.amount * 0.029 + 30)::int else 0 end)) as cents,
      bool_or(f.fee_cents is null and p.amount > 0) as estimated
    from pays p left join payment_fees f on f.order_id = p.id and f.payment = p.payment
    group by p.id
  ),
  lc as (
    select h.order_id,
      round(sum(h.qty * coalesce(l.cost_cents, 0)::numeric / nullif(l.counted_qty - l.damaged_qty, 0))) as product,
      round(sum(h.qty * coalesce(l.freight_cents, 0)::numeric / nullif(l.counted_qty - l.damaged_qty, 0))) as freight,
      round(sum(h.qty * coalesce(l.label_cents, 0)::numeric / nullif(l.counted_qty - l.damaged_qty, 0))) as label,
      round(sum(h.qty * coalesce(l.test_cents, 0)::numeric / nullif(l.counted_qty - l.damaged_qty, 0))) as test,
      sum(h.qty) as vials,
      sum(case when l.cost_cents is not null then h.qty else 0 end) as costed
    from lot_holds h join lots l on l.id = h.lot_id
    where h.order_id in (select id from o) and h.state in ('held', 'sold')
    group by h.order_id
  )
  select o.id, (o.subtotal_cents - o.partner_discount_cents)::bigint,
    coalesce(lc.product, 0)::bigint, coalesce(lc.freight, 0)::bigint, coalesce(lc.label, 0)::bigint, coalesce(lc.test, 0)::bigint,
    coalesce(o.packaging_cents, 0)::bigint,
    coalesce(fees.cents, 0)::bigint, coalesce(fees.estimated, false),
    coalesce((select c.amount_cents from commissions c where c.order_id = o.id and c.state <> 'void'), 0)::bigint,
    coalesce(lc.vials, 0)::bigint, coalesce(lc.costed, 0)::bigint
  from o left join lc on lc.order_id = o.id left join fees on fees.id = o.id
$$;
revoke all on function order_profit_rows(timestamptz, timestamptz, uuid) from public, anon, authenticated;
grant execute on function order_profit_rows(timestamptz, timestamptz, uuid) to service_role;

-- Today: profit of the sales paid in [p_from, p_to).
create or replace function admin_profit_summary(p_from timestamptz, p_to timestamptz) returns json
language sql stable security definer set search_path = public, pg_temp as $$
  select json_build_object(
    'orders', count(*),
    'goods_cents', coalesce(sum(goods_cents), 0),
    'cost_cents', coalesce(sum(product_cents + freight_cents + label_cents + test_cents + packaging_cents + fee_cents + commission_cents), 0),
    'profit_cents', coalesce(sum(goods_cents - product_cents - freight_cents - label_cents - test_cents - packaging_cents - fee_cents - commission_cents), 0),
    'uncosted_orders', count(*) filter (where vials_costed < vials or vials = 0),
    'fees_estimated', count(*) filter (where fee_estimated))
  from order_profit_rows(p_from, p_to, null)
$$;
revoke all on function admin_profit_summary(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function admin_profit_summary(timestamptz, timestamptz) to service_role;
