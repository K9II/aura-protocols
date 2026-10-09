-- Wholesale Part 2: production runs (spec 2026-10-08-wholesale-kits-design.md).
-- Apply after wholesale.sql. RLS on, no policies: service role, server only.
-- A run is keyed by its cutoff date; orders join it through orders.wholesale_cutoff_on.

create sequence if not exists production_run_number_seq start 1001;

create table if not exists production_runs (
  id          uuid primary key default gen_random_uuid(),
  number      text not null unique default ('R-' || nextval('production_run_number_seq')),
  cutoff_on   date not null unique,
  notes       text not null default '' check (length(notes) <= 4000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table production_runs enable row level security;

-- One line per strength the run makes. kits_ordered = the wholesale kits sent
-- to the supplier (snapshot when the order is recorded); extra_boxes = retail restock.
create table if not exists production_run_lines (
  id            uuid primary key default gen_random_uuid(),
  run_id        uuid not null references production_runs(id) on delete cascade,
  slug          text not null,
  variant_id    text not null,
  kits_ordered  integer check (kits_ordered is null or kits_ordered >= 0),
  extra_boxes   integer not null default 0 check (extra_boxes between 0 and 500),
  supplier      text check (supplier is null or length(trim(supplier)) between 1 and 80),
  cost_cents    integer check (cost_cents is null or cost_cents >= 0),
  supplier_ref  text check (supplier_ref is null or length(supplier_ref) <= 120),
  ordered_at    timestamptz,
  lot_id        uuid references lots(id),
  result        text not null default 'pending' check (result in ('pending', 'passed', 'failed')),
  result_at     timestamptz,
  fail_note     text check (fail_note is null or length(fail_note) <= 2000),
  created_at    timestamptz not null default now(),
  unique (run_id, slug, variant_id),
  foreign key (slug, variant_id) references catalog_variants(slug, variant_id)
);
create index if not exists production_run_lines_lot_idx on production_run_lines (lot_id) where lot_id is not null;
alter table production_run_lines enable row level security;

create table if not exists production_run_events (
  id          uuid primary key default gen_random_uuid(),
  run_id      uuid not null references production_runs(id) on delete cascade,
  line_id     uuid references production_run_lines(id) on delete set null,
  order_id    uuid references orders(id) on delete set null,
  kind        text not null check (kind in ('line_ordered', 'lot_linked', 'line_passed', 'line_failed', 'line_resourced',
                'balance_due', 'reminder_sent', 'overdue_alerted', 'forfeited', 'order_cancelled', 'lot_failed_emailed',
                'past_cutoff_alerted', 'note')),
  detail      text,
  actor_id    uuid,
  event_key   text unique,     -- cron/once-only entries; null for owner actions
  created_at  timestamptz not null default now()
);
create index if not exists production_run_events_run_idx on production_run_events (run_id, created_at desc);
alter table production_run_events enable row level security;

-- The run for a cutoff, created on first use.
create or replace function ensure_production_run(p_cutoff date) returns uuid language plpgsql
set search_path = public, pg_temp as $$
declare v uuid;
begin
  insert into production_runs (cutoff_on) values (p_cutoff) on conflict (cutoff_on) do nothing;
  select id into v from production_runs where cutoff_on = p_cutoff;
  return v;
end $$;
revoke all on function ensure_production_run(date) from public, anon, authenticated;

-- A strength passed: its lot goes live and, in the same transaction (under the
-- strength's stock lock that admin_lot_live takes), 10 vials per kit are held
-- from THAT lot for every deposit-paid order of the run — before any retail
-- checkout can see the lot. All or nothing per order line; a short line is
-- reported back (the caller alerts) and that order isn't held.
-- Returns {"ok":true,"held":n,"short":[order numbers]} | {"ok":false,"reason":...}
create or replace function pass_run_line(p_line uuid, p_actor uuid) returns json language plpgsql
set search_path = public, pg_temp as $$
declare
  ln production_run_lines%rowtype;
  v_cutoff date;
  v_live text;
  v_lot_number text;
  it record;
  avail integer;
  held integer := 0;
  shorts text[] := '{}';
begin
  select * into ln from production_run_lines where id = p_line for update;
  if not found then return json_build_object('ok', false, 'reason', 'missing'); end if;
  if ln.result <> 'pending' then return json_build_object('ok', false, 'reason', 'not_pending'); end if;
  if ln.lot_id is null then return json_build_object('ok', false, 'reason', 'no_lot'); end if;
  v_live := admin_lot_live(ln.lot_id, p_actor);
  if v_live <> 'ok' then return json_build_object('ok', false, 'reason', v_live); end if;
  select cutoff_on into v_cutoff from production_runs where id = ln.run_id;
  select lot_number into v_lot_number from lots where id = ln.lot_id;
  for it in
    select i.id as item_id, i.order_id, o.order_number, i.pack_qty * i.quantity as need
    from order_items i join orders o on o.id = i.order_id
    where o.channel = 'wholesale' and o.status = 'deposit_paid' and o.wholesale_cutoff_on = v_cutoff
      and i.compound_slug = ln.slug and i.variant_id = ln.variant_id
      and not exists (select 1 from lot_holds h where h.order_item_id = i.id and h.state in ('held', 'sold'))
    order by o.created_at, o.order_number
  loop
    select available into avail from lot_stock where id = ln.lot_id;
    if coalesce(avail, 0) < it.need then
      shorts := shorts || it.order_number;
      continue;
    end if;
    insert into lot_holds (order_id, order_item_id, lot_id, qty) values (it.order_id, it.item_id, ln.lot_id, it.need);
    update order_items set lot_number = v_lot_number where id = it.item_id;
    held := held + 1;
  end loop;
  update production_run_lines set result = 'passed', result_at = now() where id = p_line;
  insert into production_run_events (run_id, line_id, kind, detail, actor_id)
    values (ln.run_id, p_line, 'line_passed', 'lot ' || v_lot_number || ' · held ' || held || ' order line(s)', p_actor);
  return json_build_object('ok', true, 'held', held, 'short', to_json(shorts));
end $$;
revoke all on function pass_run_line(uuid, uuid) from public, anon, authenticated;

-- Holds follow the order (supersedes catalog-ops.sql's version): a wholesale
-- order refunded from deposit_paid (buyer cancels after one of its strengths
-- passed) releases those vials to retail.
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
  elsif new.status = 'refunded' and old.status = 'deposit_paid' then
    update lot_holds set state = 'released', settled_at = now() where order_id = new.id and state = 'held';
  end if;
  return new;
end $$;

-- Catalog → strength ⋯ → Sell as a wholesale kit / Stop selling as a kit.
alter table catalog_events drop constraint if exists catalog_events_kind_check;
alter table catalog_events add constraint catalog_events_kind_check check (kind in ('price_changed', 'low_at_changed', 'threepl_sku_changed', 'shown', 'hidden',
  'lot_received', 'lot_edited', 'lot_live', 'lot_retired', 'count_corrected', 'certificate_replaced',
  'oversold', 'lot_mismatch', 'strength_added', 'strength_shown', 'strength_hidden', 'strength_archived',
  'strength_restored', 'strength_deleted', 'wholesale_on', 'wholesale_off'));

alter table customer_events drop constraint if exists customer_events_kind_check;
alter table customer_events add constraint customer_events_kind_check check (kind in (
  'blocked', 'unblocked', 'credit_added', 'credit_removed', 'verify_resent',
  'warning_refunded', 'warning_watched', 'warning_closed', 'wholesale_on', 'wholesale_off'));
