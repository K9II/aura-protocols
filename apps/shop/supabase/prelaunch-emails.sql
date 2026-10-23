-- supabase/prelaunch-emails.sql
-- The pre-launch emails (2026-10-23): campaign kinds first_look / early_access / we_are_open (fixed wording,
-- lib/email/prelaunch.ts), sent once each to the waitlist audiences.
-- Apply after email-admin.sql, no-charge.sql and audit.sql. Safe to re-run. It supersedes
-- email_audience and admin_email_audience_counts (latest were no-charge.sql / email-admin.sql):
-- if either of those files is re-run, re-apply this one after it.

-- Kind and audience checks: drop whichever check constraint covers each column, then add ours.
do $$
declare r record;
begin
  for r in select conname from pg_constraint
           where conrelid = 'public.campaigns'::regclass and contype = 'c'
             and (pg_get_constraintdef(oid) like '%kind%' or pg_get_constraintdef(oid) like '%audience%')
             and conname not in ('campaigns_kind_check', 'campaigns_audience_check')
  loop
    execute format('alter table campaigns drop constraint %I', r.conname);
  end loop;
end $$;
alter table campaigns drop constraint if exists campaigns_kind_check;
alter table campaigns add constraint campaigns_kind_check
  check (kind in ('new_lots','promotion','news','first_look','early_access','we_are_open'));
alter table campaigns drop constraint if exists campaigns_audience_check;
alter table campaigns add constraint campaigns_audience_check
  check (audience in ('all','ordered','never_ordered','waitlist','waitlist_never_ordered'));

-- Each pre-launch email exists once (Email → Pre-launch opens it; it can't be copied).
drop index if exists campaigns_one_prelaunch;
create unique index campaigns_one_prelaunch on campaigns (kind) where kind in ('first_look','early_access','we_are_open');

-- Early access (pre-launch email 3): sending it turns this on; Email → Pre-launch has the switch.
-- While on, a browser holding a signed aura_early cookie gets past the coming-soon page.
alter table shop_settings add column if not exists early_access_open boolean not null default false;

-- Confirmed subscribers, minus blocked accounts, by audience. Orders count as sales only
-- (no-charge.sql). The waitlist audiences = subscribers who joined the pre-launch waitlist.
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
        select 1 from orders o where lower(o.email) = s.email and o.status in ('paid','processing','shipped','refunded') and o.kind = 'sale'))
      or (p_audience = 'waitlist' and s.waitlist_at is not null)
      or (p_audience = 'waitlist_never_ordered' and s.waitlist_at is not null and not exists (
        select 1 from orders o where lower(o.email) = s.email and o.status in ('paid','processing','shipped','refunded') and o.kind = 'sale')))
$$;
revoke all on function email_audience(text) from public, anon, authenticated;
grant execute on function email_audience(text) to service_role;

create or replace function admin_email_audience_counts() returns json
language sql stable security definer set search_path = public, pg_temp as $$
  select json_build_object(
    'all', (select count(*) from email_audience('all')),
    'ordered', (select count(*) from email_audience('ordered')),
    'never_ordered', (select count(*) from email_audience('never_ordered')),
    'waitlist', (select count(*) from email_audience('waitlist')),
    'waitlist_never_ordered', (select count(*) from email_audience('waitlist_never_ordered')))
$$;
revoke all on function admin_email_audience_counts() from public, anon, authenticated;
grant execute on function admin_email_audience_counts() to service_role;

-- The switch's on/off is logged in the email Activity. Replaces the action check from
-- audit.sql — if that file is re-run, re-apply this one after it.
alter table email_admin_events drop constraint if exists email_admin_events_action_check;
alter table email_admin_events add constraint email_admin_events_action_check check (action in (
  'paused','resumed','created','scheduled','unscheduled','send_started','stopped','finished','test_sent','copied','edited',
  'early_access_on','early_access_off'));
