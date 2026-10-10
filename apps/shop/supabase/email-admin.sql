-- supabase/email-admin.sql
-- Admin command center, part 4: email (campaigns, automations, stats).
-- Run after email.sql, account-gate.sql, discount-codes.sql and customers-admin.sql. Idempotent.
-- RLS on, no policies: service role only.

create table if not exists campaigns (
  id                uuid primary key default gen_random_uuid(),
  kind              text not null check (kind in ('new_lots','promotion','news')),
  status            text not null default 'draft' check (status in ('draft','scheduled','sending','sent','stopped')),
  name              text not null,
  subject           text not null default '',
  preview_text      text not null default '',
  content           jsonb not null default '{}'::jsonb,           -- { headline, body, buttonLabel, buttonPath }
  audience          text not null default 'all' check (audience in ('all','ordered','never_ordered')),
  discount_code_id  uuid references discount_codes(id),
  lots_snapshot     jsonb not null default '[]'::jsonb,           -- AlertLot[] as ticked
  scheduled_for     timestamptz,
  started_at        timestamptz,
  finished_at       timestamptz,
  recipients        integer not null default 0,
  created_by        uuid references customers(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (status <> 'scheduled' or scheduled_for is not null)
);
create unique index if not exists campaigns_one_sending on campaigns ((true)) where status = 'sending';
create index if not exists campaigns_status_idx on campaigns (status, scheduled_for);
create index if not exists campaigns_created_idx on campaigns (created_at desc);
alter table campaigns enable row level security;

create table if not exists campaign_recipients (
  campaign_id  uuid not null references campaigns(id) on delete cascade,
  email        text not null,
  state        text not null default 'pending' check (state in ('pending','sent','skipped','failed')),
  attempts     integer not null default 0,
  last_error   text,
  sent_at      timestamptz,
  primary key (campaign_id, email)
);
create index if not exists campaign_recipients_pending_idx on campaign_recipients (campaign_id, email) where state = 'pending';
alter table campaign_recipients enable row level security;

create table if not exists email_events (
  id              uuid primary key default gen_random_uuid(),
  type            text not null check (type in ('bounce','complaint','unsubscribe')),
  email           text not null,
  ses_message_id  text,
  source_kind     text,             -- email_sends.kind it came from (welcome_3, cart_1, campaign …), null = unknown
  source_ref      text,             -- campaign id for kind 'campaign'
  at              timestamptz not null default now()
);
create index if not exists email_events_at_idx on email_events (at desc);
create index if not exists email_events_source_idx on email_events (source_kind, source_ref);
alter table email_events enable row level security;

create table if not exists email_runs (
  id              uuid primary key default gen_random_uuid(),
  started_at      timestamptz not null default now(),
  finished_at     timestamptz,
  welcome_sent    integer not null default 0,
  cart_sent       integer not null default 0,
  cart_skipped    integer not null default 0,
  campaign_sent   integer not null default 0,
  failures        integer not null default 0,
  error_text      text
);
create index if not exists email_runs_started_idx on email_runs (started_at desc);
alter table email_runs enable row level security;

create table if not exists email_admin_events (
  id      uuid primary key default gen_random_uuid(),
  action  text not null check (action in ('paused','resumed','created','scheduled','unscheduled','send_started','stopped','finished','test_sent','copied')),
  target  text not null,            -- 'welcome' | 'cart' | a campaign id
  actor   uuid references customers(id) on delete set null,
  note    text,
  at      timestamptz not null default now()
);
create index if not exists email_admin_events_target_idx on email_admin_events (target, at desc);
alter table email_admin_events enable row level security;

alter table email_sends add column if not exists skipped boolean not null default false;
alter table email_sends drop constraint if exists email_sends_kind_check;
alter table email_sends add constraint email_sends_kind_check check (kind in ('confirm','welcome_1','welcome_2','welcome_3','welcome_4','welcome_5','cart_1','cart_2','cart_3','lot_alert','campaign'));
create index if not exists email_sends_sent_at_idx on email_sends (sent_at desc);
create index if not exists email_sends_ses_idx on email_sends (ses_message_id) where ses_message_id is not null;

alter table shop_settings add column if not exists welcome_paused boolean not null default false;
alter table shop_settings add column if not exists cart_paused boolean not null default false;

-- Confirmed subscribers, minus blocked accounts, split by whether they've ordered.
-- superseded by no-charge.sql
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
        select 1 from orders o where lower(o.email) = s.email and o.status in ('paid','processing','shipped','refunded')))
      or (p_audience = 'never_ordered' and not exists (
        select 1 from orders o where lower(o.email) = s.email and o.status in ('paid','processing','shipped','refunded'))))
$$;

create or replace function admin_email_audience_counts() returns json
language sql stable security definer set search_path = public, pg_temp as $$
  select json_build_object(
    'all', (select count(*) from email_audience('all')),
    'ordered', (select count(*) from email_audience('ordered')),
    'never_ordered', (select count(*) from email_audience('never_ordered')))
$$;

-- Draft/scheduled → sending, freezing the recipient list. p_from is the status
-- the caller saw, so Send now and the hourly run can't both start it.
create or replace function admin_start_campaign(p_id uuid, p_actor uuid, p_from text) returns integer
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_status text; v_aud text; v_n integer;
begin
  select status, audience into v_status, v_aud from campaigns where id = p_id for update;
  if v_status is null or v_status <> p_from or v_status not in ('draft','scheduled') then
    raise exception 'stale_campaign';
  end if;
  -- Serialise starts of different campaigns so two can't both pass the busy check.
  perform pg_advisory_xact_lock(hashtext('admin_start_campaign'));
  if exists (select 1 from campaigns where status = 'sending') then
    raise exception 'campaign_busy';
  end if;
  insert into campaign_recipients (campaign_id, email) select p_id, a.email from email_audience(v_aud) a on conflict do nothing;
  get diagnostics v_n = row_count;
  update campaigns set status = 'sending', started_at = now(), recipients = v_n, updated_at = now() where id = p_id;
  insert into email_admin_events (action, target, actor, note) values ('send_started', p_id::text, p_actor, v_n || ' recipients');
  return v_n;
end $$;

create or replace function admin_email_overview() returns json
language sql stable security definer set search_path = public, pg_temp as $$
  select json_build_object(
    'confirmed', (select count(*) from subscribers where status = 'confirmed'),
    'pending', (select count(*) from subscribers where status = 'pending'),
    'unsubscribed', (select count(*) from subscribers where status = 'unsubscribed'),
    'sent_30d', (select count(*) from email_sends where not skipped and coalesce(ref, '') not like 'test-%' and sent_at >= now() - interval '30 days'),
    'sent_prior_30d', (select count(*) from email_sends where not skipped and coalesce(ref, '') not like 'test-%'
                        and sent_at >= now() - interval '60 days' and sent_at < now() - interval '30 days'),
    'bounces_30d', (select count(*) from email_events where type = 'bounce' and at >= now() - interval '30 days'),
    'complaints_30d', (select count(*) from email_events where type = 'complaint' and at >= now() - interval '30 days'))
$$;

-- Sent / bounced / complaints / unsubscribed per kind (welcome_3, cart_1 …)
-- and per campaign (kind 'campaign', ref = campaign id).
create or replace function admin_email_send_stats(p_since timestamptz)
returns table (kind text, ref text, sent bigint, bounced bigint, complaints bigint, unsubscribed bigint)
language sql stable security definer set search_path = public, pg_temp as $$
  with s as (
    select es.kind, case when es.kind = 'campaign' then es.ref end as ref, count(*) as sent
    from email_sends es
    where not es.skipped and coalesce(es.ref, '') not like 'test-%' and es.sent_at >= p_since
    group by 1, 2),
  e as (
    select ev.source_kind as kind, case when ev.source_kind = 'campaign' then ev.source_ref end as ref,
      count(*) filter (where ev.type = 'bounce') as b,
      count(*) filter (where ev.type = 'complaint') as c,
      count(*) filter (where ev.type = 'unsubscribe') as u
    from email_events ev
    where ev.at >= p_since and ev.source_kind is not null
    group by 1, 2)
  select coalesce(s.kind, e.kind), coalesce(s.ref, e.ref), coalesce(s.sent, 0), coalesce(e.b, 0), coalesce(e.c, 0), coalesce(e.u, 0)
  from s full join e on s.kind = e.kind and s.ref is not distinct from e.ref
$$;

-- A paid order is credited to the most recent campaign or welcome file sent
-- to its email in the p_days before payment.
-- superseded by no-charge.sql
create or replace function admin_email_attribution(p_since timestamptz, p_days integer)
returns table (kind text, ref text, orders bigint, revenue_cents bigint)
language sql stable security definer set search_path = public, pg_temp as $$
  with paid as (
    select o.id, lower(o.email) as email, o.paid_at, o.subtotal_cents - o.partner_discount_cents as goods
    from orders o
    where o.status in ('paid','shipped') and o.paid_at is not null and o.paid_at >= p_since),
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

-- Checkouts that got a reminder since p_since, and how many came back:
-- the reminded order was paid, or the customer paid another order within
-- p_hours of the last reminder (a new checkout cancels the old one).
-- superseded by no-charge.sql
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
        where o.id = r.order_id and n.status in ('paid','shipped')
          and n.paid_at > r.first_sent and n.paid_at <= r.last_sent + make_interval(hours => p_hours)
        order by n.paid_at limit 1)) as goods
    from reminded r)
  select json_build_object('reminded', count(*), 'recovered', count(goods), 'revenue_cents', coalesce(sum(goods), 0)) from rec
$$;

revoke all on function email_audience(text) from public, anon, authenticated;
revoke all on function admin_email_audience_counts() from public, anon, authenticated;
revoke all on function admin_start_campaign(uuid, uuid, text) from public, anon, authenticated;
revoke all on function admin_email_overview() from public, anon, authenticated;
revoke all on function admin_email_send_stats(timestamptz) from public, anon, authenticated;
revoke all on function admin_email_attribution(timestamptz, integer) from public, anon, authenticated;
revoke all on function admin_cart_recovery(timestamptz, integer) from public, anon, authenticated;
grant execute on function email_audience(text) to service_role;
grant execute on function admin_email_audience_counts() to service_role;
grant execute on function admin_start_campaign(uuid, uuid, text) to service_role;
grant execute on function admin_email_overview() to service_role;
grant execute on function admin_email_send_stats(timestamptz) to service_role;
grant execute on function admin_email_attribution(timestamptz, integer) to service_role;
grant execute on function admin_cart_recovery(timestamptz, integer) to service_role;
