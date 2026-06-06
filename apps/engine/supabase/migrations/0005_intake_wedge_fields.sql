-- supabase/migrations/0005_intake_wedge_fields.sql
alter table public.profiles
  add column if not exists glp1_status        text check (glp1_status in ('never','current','recently_stopped')),
  add column if not exists glp1_stopped_month text,
  add column if not exists menopause_status   text check (menopause_status in ('pre','peri','post','not_applicable'));
