-- COA library (spec 2026-10-11-coa-library-design.md). Apply after
-- catalog-ops.sql and wholesale-runs.sql. Supersedes catalog-ops.sql's
-- lot_stock view and admin_lot_live, and wholesale-runs.sql's
-- catalog_events kind check — if wholesale-runs.sql is re-run, re-apply this
-- file after it. A lot carries one or more certificates; the lot's own
-- purity/method/tested_on/coa_path columns move into certificates and are
-- dropped. RLS on, no policies: service role from the server only.
begin;

create table if not exists labs (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null unique check (length(trim(name)) between 2 and 80),
  city                 text check (city is null or length(trim(city)) between 1 and 80),
  verify_url_template  text check (verify_url_template is null or (length(verify_url_template) <= 200
                         and verify_url_template ~ '^https://' and position('{report}' in verify_url_template) > 0)),
  iso17025             boolean not null default false,
  active               boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
alter table labs enable row level security;

insert into labs (name, city, verify_url_template, iso17025, active) values
  ('Vanguard Laboratory', 'Olympia, WA', 'https://verifiedbyvanguard.com/verify/{report}', true, true),
  ('ILS Laboratories', 'San Diego, CA', 'https://portal.ils-lab.com/verify/{report}', true, true),
  ('Freedom Diagnostics', 'Franklin, TN', 'https://coas.freedomdiagnosticstesting.com/{report}.pdf', false, true),
  ('BTLabs', null, null, false, true),
  ('Not recorded', null, null, false, false)
on conflict (name) do nothing;

create table if not exists lot_certificates (
  id               uuid primary key default gen_random_uuid(),
  lot_id           uuid not null references lots(id) on delete cascade,
  lab_id           uuid not null references labs(id),
  report_number    text not null check (length(trim(report_number)) between 2 and 60),
  tested_on        date not null,
  coa_path         text not null,
  purity_pct       numeric(5,2) check (purity_pct is null or purity_pct between 90 and 100),
  method           text check (method is null or method in ('HPLC', 'HPLC+MS')),
  measured_mg      numeric(9,2) check (measured_mg is null or measured_mg > 0),
  identity text not null default 'not_tested' check (identity in ('pass', 'fail', 'not_tested')),
  endotoxin text not null default 'not_tested' check (endotoxin in ('pass', 'fail', 'not_tested')),
  sterility text not null default 'not_tested' check (sterility in ('pass', 'fail', 'not_tested')),
  heavy_metals text not null default 'not_tested' check (heavy_metals in ('pass', 'fail', 'not_tested')),
  fentanyl text not null default 'not_tested' check (fentanyl in ('pass', 'fail', 'not_tested')),
  result           text not null check (result in ('pass', 'fail')),
  note             text check (note is null or length(note) <= 500),
  correction_note  text check (correction_note is null or length(trim(correction_note)) between 1 and 300),
  corrected_at     timestamptz,
  corrected_by     uuid,
  created_by       uuid,
  created_at       timestamptz not null default now(),
  unique (lab_id, report_number),
  check ((purity_pct is null) = (method is null)),
  check (purity_pct is not null or array_position(array[identity, endotoxin, sterility, heavy_metals, fentanyl], 'pass') is not null
         or array_position(array[identity, endotoxin, sterility, heavy_metals, fentanyl], 'fail') is not null),
  check (result = 'pass' or length(trim(coalesce(note, ''))) > 0)
);
create index if not exists lot_certificates_lot_idx on lot_certificates (lot_id, tested_on desc);
alter table lot_certificates enable row level security;

-- Draft lot: certificates change freely. Once the lot is live (or sold out /
-- retired) a certificate is fixed: a new one (re-test) may be added, and an
-- update may change only the correction fields. Deletes are refused. The
-- parent lot is looked up by old.lot_id for update/delete (so an update
-- can't bypass the lock by moving a locked certificate onto a draft lot);
-- a cascade delete of the lot itself removes the lot row before the FK's
-- cascade removes its certificates, so a missing parent (v_status null) is
-- treated the same as draft.
create or replace function guard_lot_certificates() returns trigger language plpgsql
set search_path = public, pg_temp as $$
declare v_status text;
begin
  select status into v_status from lots where id = case when tg_op = 'INSERT' then new.lot_id else old.lot_id end;
  if v_status is null or v_status = 'draft' or tg_op = 'INSERT' then return coalesce(new, old); end if;
  if tg_op = 'UPDATE' and new.correction_note is not null
     and (to_jsonb(new) - 'correction_note' - 'corrected_at' - 'corrected_by')
       = (to_jsonb(old) - 'correction_note' - 'corrected_at' - 'corrected_by') then
    return new;
  end if;
  raise exception 'certificate_locked';
end $$;
drop trigger if exists lot_certificates_guard on lot_certificates;
create trigger lot_certificates_guard before insert or update or delete on lot_certificates
  for each row execute function guard_lot_certificates();

-- Each lot's existing certificate becomes its first certificate (lab "Not
-- recorded"; report number = the lot number, unique per lab). Idempotent;
-- guarded by a column check (dynamic SQL) so a second run, after the
-- columns below are dropped, is a no-op instead of a parse-time error.
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'lots' and column_name = 'purity_pct') then
    execute $m$
      insert into lot_certificates (lot_id, lab_id, report_number, tested_on, coa_path, purity_pct, method, result, created_at)
      select l.id, (select id from labs where name = 'Not recorded'), l.lot_number, l.tested_on, l.coa_path, l.purity_pct, l.method, 'pass', l.received_at
      from lots l
      where l.purity_pct is not null and l.coa_path is not null
        and not exists (select 1 from lot_certificates c where c.lot_id = l.id)
      on conflict (lab_id, report_number) do nothing
    $m$;
  end if;
end $$;

-- Held + sold vials per lot; available = sellable − held − sold. The
-- certificate columns come from the lot's headline certificate: its latest
-- passing certificate with purity. purity_ok / endotoxin_ok = what
-- admin_lot_live checks. Same column order as before (create or replace).
create or replace view lot_stock with (security_invoker = true) as
select l.id, l.lot_number, l.slug, l.variant_id, hc.purity_pct, hc.method, hc.tested_on, hc.coa_path, l.status,
  l.ordered_qty, l.counted_qty, l.damaged_qty, l.adjust_qty, l.discrepancy_note, l.received_by, l.received_at,
  l.live_at, l.retired_at, l.created_at,
  (l.counted_qty - l.damaged_qty + l.adjust_qty) as sellable,
  coalesce(h.held, 0)::int as held,
  coalesce(h.sold, 0)::int as sold,
  (l.counted_qty - l.damaged_qty + l.adjust_qty - coalesce(h.held, 0) - coalesce(h.sold, 0))::int as available,
  (hc.id is not null) as purity_ok,
  exists (select 1 from lot_certificates e where e.lot_id = l.id and e.result = 'pass' and e.endotoxin = 'pass') as endotoxin_ok
from lots l
left join lateral (
  select c.id, c.purity_pct, c.method, c.tested_on, c.coa_path from lot_certificates c
  where c.lot_id = l.id and c.result = 'pass' and c.purity_pct is not null
  order by c.tested_on desc, c.created_at desc limit 1
) hc on true
left join (
  select lot_id,
    sum(qty) filter (where state = 'held') as held,
    sum(qty) filter (where state = 'sold') as sold
  from lot_holds group by lot_id
) h on h.lot_id = l.id;
revoke all on lot_stock from public, anon, authenticated;

alter table lots drop column if exists purity_pct;
alter table lots drop column if exists method;
alter table lots drop column if exists tested_on;
alter table lots drop column if exists coa_path;

-- 'ok' | 'missing' | 'not_draft' | 'needs_purity' | 'needs_endotoxin' | 'nothing_sellable'
-- (locks: see catalog-ops.sql — FOR NO KEY UPDATE, same stock advisory key)
create or replace function admin_lot_live(p_lot uuid, p_actor uuid) returns text language plpgsql
set search_path = public, pg_temp as $$
declare l lots%rowtype;
begin
  select * into l from lots where id = p_lot for no key update;
  if not found then return 'missing'; end if;
  perform pg_advisory_xact_lock(hashtext('stock:' || l.slug || ':' || l.variant_id));
  if l.status <> 'draft' then return 'not_draft'; end if;
  if not exists (select 1 from lot_certificates c where c.lot_id = p_lot and c.result = 'pass' and c.purity_pct is not null) then
    return 'needs_purity';
  end if;
  if not exists (select 1 from lot_certificates c where c.lot_id = p_lot and c.result = 'pass' and c.endotoxin = 'pass') then
    return 'needs_endotoxin';
  end if;
  if l.counted_qty - l.damaged_qty + l.adjust_qty <= 0 then return 'nothing_sellable'; end if;
  update lots set status = 'live', live_at = now() where id = p_lot;
  insert into catalog_events (slug, variant_id, lot_id, kind, actor_id) values (l.slug, l.variant_id, l.id, 'lot_live', p_actor);
  return 'ok';
end $$;
revoke all on function admin_lot_live(uuid, uuid) from public, anon, authenticated;

alter table catalog_events drop constraint if exists catalog_events_kind_check;
alter table catalog_events add constraint catalog_events_kind_check check (kind in ('price_changed', 'low_at_changed', 'threepl_sku_changed', 'shown', 'hidden',
  'lot_received', 'lot_edited', 'lot_live', 'lot_retired', 'count_corrected', 'certificate_replaced',
  'oversold', 'lot_mismatch', 'strength_added', 'strength_shown', 'strength_hidden', 'strength_archived',
  'strength_restored', 'strength_deleted', 'wholesale_on', 'wholesale_off',
  'certificate_added', 'certificate_edited', 'certificate_deleted', 'certificate_corrected'));

alter table shop_settings add column if not exists coa_show_all boolean not null default false;
alter table shop_settings add column if not exists coa_show_measured boolean not null default false;

commit;
