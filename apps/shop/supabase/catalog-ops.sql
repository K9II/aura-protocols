-- Catalog & lots (admin command center part 3). Product content stays in
-- data/catalog.ts; everything that changes lives here. RLS on, no policies:
-- service role from the server only. Stock is derived from lot_holds (the
-- lot_stock view) and moves only through the functions and trigger below.

create table if not exists catalog_products (
  slug        text primary key,
  shown       boolean not null default true,
  updated_at  timestamptz not null default now()
);
alter table catalog_products enable row level security;

create table if not exists catalog_variants (
  slug         text not null references catalog_products(slug) on delete cascade,
  variant_id   text not null,
  price_cents  integer not null check (price_cents > 0),
  low_at       integer not null default 20 check (low_at >= 0),
  threepl_sku  text unique check (threepl_sku is null or threepl_sku ~ '^[A-Z0-9][A-Z0-9-]{1,39}$'),
  updated_at   timestamptz not null default now(),
  primary key (slug, variant_id)
);
alter table catalog_variants enable row level security;

create table if not exists lots (
  id                uuid primary key default gen_random_uuid(),
  lot_number        text not null unique check (lot_number ~ '^[A-Z0-9][A-Z0-9-]{2,39}$'),
  slug              text not null,
  variant_id        text not null,
  purity_pct        numeric(5,2) not null check (purity_pct between 90 and 100),
  method            text not null check (method in ('HPLC', 'HPLC+MS')),
  tested_on         date not null,
  coa_path          text,
  status            text not null default 'draft' check (status in ('draft', 'live', 'retired')),
  ordered_qty       integer not null check (ordered_qty >= 0),
  counted_qty       integer not null check (counted_qty >= 0),
  damaged_qty       integer not null default 0 check (damaged_qty >= 0 and damaged_qty <= counted_qty),
  adjust_qty        integer not null default 0,
  discrepancy_note  text,
  received_by       uuid,
  received_at       timestamptz not null default now(),
  live_at           timestamptz,
  retired_at        timestamptz,
  created_at        timestamptz not null default now(),
  foreign key (slug, variant_id) references catalog_variants(slug, variant_id),
  check ((counted_qty = ordered_qty and damaged_qty = 0) or length(trim(coalesce(discrepancy_note, ''))) > 0)
);
create index if not exists lots_variant_idx on lots (slug, variant_id, status, live_at);
alter table lots enable row level security;

create table if not exists lot_holds (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references orders(id) on delete cascade,
  order_item_id  uuid not null references order_items(id) on delete cascade,
  lot_id         uuid not null references lots(id),
  qty            integer not null check (qty > 0),
  state          text not null default 'held' check (state in ('held', 'sold', 'released', 'returned', 'moved')),
  created_at     timestamptz not null default now(),
  settled_at     timestamptz
);
create index if not exists lot_holds_lot_idx on lot_holds (lot_id, state);
create index if not exists lot_holds_order_idx on lot_holds (order_id);
alter table lot_holds enable row level security;

create table if not exists shipped_lots (
  id             uuid primary key default gen_random_uuid(),
  order_item_id  uuid not null references order_items(id) on delete cascade,
  lot_id         uuid references lots(id),
  lot_number     text not null,
  qty            integer not null check (qty > 0),
  source         text not null check (source in ('manual', '3pl')),
  recorded_at    timestamptz not null default now()
);
create index if not exists shipped_lots_item_idx on shipped_lots (order_item_id);
alter table shipped_lots enable row level security;

create table if not exists catalog_events (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null,
  variant_id  text,
  lot_id      uuid references lots(id),
  kind        text not null check (kind in ('price_changed', 'low_at_changed', 'threepl_sku_changed', 'shown', 'hidden',
                'lot_received', 'lot_edited', 'lot_live', 'lot_retired', 'count_corrected', 'certificate_replaced',
                'oversold', 'lot_mismatch')),
  before      jsonb,
  after       jsonb,
  reason      text,
  note        text,
  source      text not null default 'manual' check (source in ('manual', '3pl', 'system')),
  actor_id    uuid,
  created_at  timestamptz not null default now()
);
create index if not exists catalog_events_slug_idx on catalog_events (slug, created_at desc);
alter table catalog_events enable row level security;

-- Held + sold vials per lot; available = sellable − held − sold.
create or replace view lot_stock with (security_invoker = true) as
select l.*,
  (l.counted_qty - l.damaged_qty + l.adjust_qty) as sellable,
  coalesce(h.held, 0)::int as held,
  coalesce(h.sold, 0)::int as sold,
  (l.counted_qty - l.damaged_qty + l.adjust_qty - coalesce(h.held, 0) - coalesce(h.sold, 0))::int as available
from lots l
left join (
  select lot_id,
    sum(qty) filter (where state = 'held') as held,
    sum(qty) filter (where state = 'sold') as sold
  from lot_holds group by lot_id
) h on h.lot_id = l.id;
revoke all on lot_stock from public, anon, authenticated;

-- Holds every vial of a pending order, oldest live lot first, all or nothing.
-- Returns {"ok": true} | {"ok": false, "reason": "inactive"} |
-- {"ok": false, "reason": "sold_out", "short": ["slug:variant", ...]}.
-- Idempotent per order. The order row lock orders it against a cancel; the
-- per-strength advisory locks (taken in sorted order) serialise the last vial.
create or replace function hold_vials(p_order uuid) returns json language plpgsql
set search_path = public, pg_temp as $$
declare
  v_status text;
  it record;
  lt record;
  lk record;
  need integer;
  take integer;
  shorts text[] := '{}';
begin
  select status into v_status from orders where id = p_order for update;
  if v_status is distinct from 'awaiting_payment' then return json_build_object('ok', false, 'reason', 'inactive'); end if;
  if exists (select 1 from lot_holds where order_id = p_order) then return json_build_object('ok', true); end if;
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

-- Settles holds on every path, no application code: payment → sold; any
-- cancel → released; a refund of a paid (never shipped) order → returned to
-- the shelf. 'processing' (ACH pending) keeps them held. A refund after
-- shipping changes nothing (the vials left the building).
create or replace function settle_holds_on_order_status() returns trigger language plpgsql
set search_path = public, pg_temp as $$
begin
  if new.status = old.status then return new; end if;
  if new.status in ('paid', 'shipped') then
    update lot_holds set state = 'sold', settled_at = now() where order_id = new.id and state = 'held';
  elsif new.status = 'cancelled' then
    update lot_holds set state = 'released', settled_at = now() where order_id = new.id and state = 'held';
  elsif new.status = 'refunded' and old.status = 'paid' then
    update lot_holds set state = 'returned', settled_at = now() where order_id = new.id and state in ('held', 'sold');
  end if;
  return new;
end $$;
drop trigger if exists settle_holds_on_order_status on orders;
create trigger settle_holds_on_order_status after update of status on orders
  for each row execute function settle_holds_on_order_status();

-- Order lines whose held + sold vials don't cover what was ordered (an order
-- paid after its holds were released). afterOrderPaid alerts on any row.
create or replace function order_hold_shortfall(p_order uuid)
returns table (order_item_id uuid, compound_slug text, variant_id text, need integer, covered integer) language sql stable
set search_path = public, pg_temp as $$
  select i.id, i.compound_slug, i.variant_id, i.pack_qty * i.quantity,
    coalesce(sum(h.qty) filter (where h.state in ('held', 'sold')), 0)::int
  from order_items i left join lot_holds h on h.order_item_id = i.id
  where i.order_id = p_order
  group by i.id
  having coalesce(sum(h.qty) filter (where h.state in ('held', 'sold')), 0) < i.pack_qty * i.quantity
$$;
revoke all on function order_hold_shortfall(uuid) from public, anon, authenticated;

-- Admin lot functions lock the lot row FOR NO KEY UPDATE (not FOR UPDATE) so
-- they don't deadlock with hold_vials, whose lot_holds insert takes a KEY SHARE
-- lock on the lot while it holds the same stock advisory lock.
-- 'ok' | 'missing' | 'not_draft' | 'no_certificate' | 'nothing_sellable'
create or replace function admin_lot_live(p_lot uuid, p_actor uuid) returns text language plpgsql
set search_path = public, pg_temp as $$
declare l lots%rowtype;
begin
  select * into l from lots where id = p_lot for no key update;
  if not found then return 'missing'; end if;
  perform pg_advisory_xact_lock(hashtext('stock:' || l.slug || ':' || l.variant_id));
  if l.status <> 'draft' then return 'not_draft'; end if;
  if l.coa_path is null then return 'no_certificate'; end if;
  if l.counted_qty - l.damaged_qty + l.adjust_qty <= 0 then return 'nothing_sellable'; end if;
  update lots set status = 'live', live_at = now() where id = p_lot;
  insert into catalog_events (slug, variant_id, lot_id, kind, actor_id) values (l.slug, l.variant_id, l.id, 'lot_live', p_actor);
  return 'ok';
end $$;
revoke all on function admin_lot_live(uuid, uuid) from public, anon, authenticated;

-- 'ok' | 'missing' | 'draft' | 'below_committed'. Never below held + sold.
create or replace function admin_correct_count(p_lot uuid, p_delta integer, p_reason text, p_note text, p_actor uuid, p_source text)
returns text language plpgsql
set search_path = public, pg_temp as $$
declare l lots%rowtype; s record;
begin
  select * into l from lots where id = p_lot for no key update;
  if not found then return 'missing'; end if;
  perform pg_advisory_xact_lock(hashtext('stock:' || l.slug || ':' || l.variant_id));
  if l.status = 'draft' then return 'draft'; end if;
  select sellable, held, sold into s from lot_stock where id = p_lot;
  if s.sellable + p_delta < s.held + s.sold then return 'below_committed'; end if;
  update lots set adjust_qty = adjust_qty + p_delta where id = p_lot;
  insert into catalog_events (slug, variant_id, lot_id, kind, before, after, reason, note, source, actor_id)
    values (l.slug, l.variant_id, l.id, 'count_corrected', json_build_object('sellable', s.sellable),
            json_build_object('sellable', s.sellable + p_delta), p_reason, p_note, p_source, p_actor);
  return 'ok';
end $$;
revoke all on function admin_correct_count(uuid, integer, text, text, uuid, text) from public, anon, authenticated;

-- 'ok' | 'missing' | 'not_live'. Held vials still complete (holds keep their lot).
create or replace function admin_retire_lot(p_lot uuid, p_actor uuid) returns text language plpgsql
set search_path = public, pg_temp as $$
declare l lots%rowtype;
begin
  select * into l from lots where id = p_lot for no key update;
  if not found then return 'missing'; end if;
  perform pg_advisory_xact_lock(hashtext('stock:' || l.slug || ':' || l.variant_id));
  if l.status <> 'live' then return 'not_live'; end if;
  update lots set status = 'retired', retired_at = now() where id = p_lot;
  insert into catalog_events (slug, variant_id, lot_id, kind, actor_id) values (l.slug, l.variant_id, l.id, 'lot_retired', p_actor);
  return 'ok';
end $$;
revoke all on function admin_retire_lot(uuid, uuid) from public, anon, authenticated;

-- Records what actually shipped for one order line: p_entries =
-- [{"lot_number": "...", "qty": n}, ...] (null or [] raises; repeated lot
-- numbers are summed). Same lots and quantities as the sold holds → 'ok'.
-- Different → the sold holds move to the shipped lots ('moved' + new 'sold'
-- rows) when every shipped lot exists for that strength, isn't a draft and
-- has the room → 'moved'; otherwise nothing moves → 'alert'. Both mismatch
-- outcomes log 'lot_mismatch' (with the order number). Retry-safe: a line
-- that already has shipped rows writes nothing and re-compares them with its
-- holds → 'ok' if they match, 'alert' if not (a failed alert resurfaces).
create or replace function record_shipped_lots(p_item uuid, p_entries json, p_source text) returns text language plpgsql
set search_path = public, pg_temp as $$
declare
  i order_items%rowtype;
  v_order text;
  v_first boolean := false;
  e record;
  lt record;
  same boolean;
  fits boolean := true;
begin
  if p_entries is null or json_typeof(p_entries) <> 'array' or json_array_length(p_entries) = 0 then
    raise exception 'record_shipped_lots: no shipped lots given for order item %', p_item;
  end if;
  select * into i from order_items where id = p_item for update;
  if not found then raise exception 'order item % not found', p_item; end if;
  select order_number into v_order from orders where id = i.order_id;
  perform pg_advisory_xact_lock(hashtext('stock:' || i.compound_slug || ':' || i.variant_id));
  if not exists (select 1 from shipped_lots where order_item_id = p_item) then
    insert into shipped_lots (order_item_id, lot_id, lot_number, qty, source)
      select p_item, l.id, x.lot_number, x.qty, p_source
      from (select lot_number, sum(qty)::int as qty
            from json_to_recordset(p_entries) as r(lot_number text, qty integer) group by lot_number) x
      left join lots l on l.lot_number = x.lot_number;
    v_first := true;
  end if;
  select not exists (
    select 1
    from (select lot_number, sum(qty)::int as qty from shipped_lots where order_item_id = p_item group by 1) a
    full join (select l.lot_number, sum(h.qty)::int as qty from lot_holds h join lots l on l.id = h.lot_id
               where h.order_item_id = p_item and h.state = 'sold' group by 1) b on a.lot_number = b.lot_number
    where a.qty is distinct from b.qty
  ) into same;
  if same then return 'ok'; end if;
  if not v_first then return 'alert'; end if;
  for e in select s.lot_id, s.qty from shipped_lots s where s.order_item_id = p_item loop
    select id, status, available into lt from lot_stock
      where id = e.lot_id and slug = i.compound_slug and variant_id = i.variant_id;
    if not found or lt.status = 'draft' or lt.available + coalesce((select sum(qty) from lot_holds
        where order_item_id = p_item and lot_id = e.lot_id and state = 'sold'), 0) < e.qty then
      fits := false;
    end if;
  end loop;
  insert into catalog_events (slug, variant_id, kind, before, after, source, note)
    values (i.compound_slug, i.variant_id, 'lot_mismatch',
      (select json_agg(json_build_object('lot_number', l.lot_number, 'qty', h.qty)) from lot_holds h join lots l on l.id = h.lot_id
        where h.order_item_id = p_item and h.state = 'sold'),
      json_build_object('order_number', v_order, 'order_item_id', p_item,
        'shipped', (select json_agg(json_build_object('lot_number', s.lot_number, 'qty', s.qty) order by s.lot_number)
                    from shipped_lots s where s.order_item_id = p_item)),
      p_source, case when fits then 'moved' else 'not moved' end);
  if not fits then return 'alert'; end if;
  update lot_holds set state = 'moved', settled_at = now() where order_item_id = p_item and state = 'sold';
  insert into lot_holds (order_id, order_item_id, lot_id, qty, state, settled_at)
    select i.order_id, p_item, s.lot_id, s.qty, 'sold', now() from shipped_lots s where s.order_item_id = p_item;
  return 'moved';
end $$;
revoke all on function record_shipped_lots(uuid, json, text) from public, anon, authenticated;

-- For the daily reconcile: lots below zero, and holds still 'held' on orders
-- that are no longer pending.
create or replace function lot_integrity() returns json language sql stable
set search_path = public, pg_temp as $$
  select json_build_object(
    'negative', (select coalesce(json_agg(lot_number), '[]'::json) from lot_stock where available < 0),
    'stale_holds', (select coalesce(json_agg(distinct o.order_number), '[]'::json)
                    from lot_holds h join orders o on o.id = h.order_id
                    where h.state = 'held' and o.status not in ('awaiting_payment', 'processing'))
  )
$$;
revoke all on function lot_integrity() from public, anon, authenticated;

-- Certificates: public bucket, PDF only, 10 MB (COA_MAX_BYTES in lib/catalog-ops/rules.ts).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('coa', 'coa', true, 10485760, array['application/pdf'])
  on conflict (id) do nothing;

-- Seed from today's code (2026-10-05): prices from data/catalog.ts, the six
-- incretin & amylin analogs hidden. No lots — every strength starts Out of
-- stock / COA pending, which is true today.
insert into catalog_products (slug, shown) values
  ('semaglutide', false), ('tirzepatide', false), ('retatrutide', false), ('cagrilintide', false),
  ('cagrisema', false), ('retatrutide-cagrilintide', false),
  ('cjc-1295-ipamorelin', true), ('sermorelin', true), ('tesamorelin', true), ('igf-1-lr3', true),
  ('bpc-157', true), ('tb-500', true), ('kpv', true), ('aod-9604', true),
  ('ss-31', true), ('mots-c', true), ('slu-pp-332', true),
  ('epithalon', true), ('pinealon', true), ('dsip', true), ('pt-141', true),
  ('ghk-cu', true), ('nad-plus', true), ('glutathione', true),
  ('bpc-157-tb-500-blend', true), ('bpc-157-tb-500-ghk-cu', true), ('bpc-157-tb-500-ghk-cu-kpv', true)
on conflict do nothing;

insert into catalog_variants (slug, variant_id, price_cents) values
  ('semaglutide', '10mg', 11900), ('tirzepatide', '10mg', 11900), ('tirzepatide', '20mg', 14900),
  ('retatrutide', '10mg', 13900), ('retatrutide', '20mg', 16900), ('cagrilintide', '10mg', 12900),
  ('cagrisema', '10mg', 15900), ('retatrutide-cagrilintide', '10mg', 17900),
  ('cjc-1295-ipamorelin', '10mg', 8900), ('sermorelin', '10mg', 5900), ('tesamorelin', '10mg', 10900),
  ('igf-1-lr3', '1mg', 8900), ('bpc-157', '10mg', 7900), ('tb-500', '10mg', 8900), ('kpv', '10mg', 5500),
  ('aod-9604', '10mg', 5900), ('ss-31', '10mg', 7900), ('ss-31', '50mg', 10900), ('mots-c', '10mg', 6900),
  ('slu-pp-332', '250mcg', 7900), ('epithalon', '10mg', 4900), ('pinealon', '10mg', 5900), ('dsip', '5mg', 4900),
  ('pt-141', '10mg', 5500), ('ghk-cu', '50mg', 5900), ('nad-plus', '500mg', 8900), ('glutathione', '600mg', 6900),
  ('bpc-157-tb-500-blend', '10mg', 9900), ('bpc-157-tb-500-ghk-cu', '70mg', 15900),
  ('bpc-157-tb-500-ghk-cu-kpv', '80mg', 18900)
on conflict do nothing;
