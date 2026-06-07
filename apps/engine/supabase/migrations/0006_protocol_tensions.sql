-- supabase/migrations/0006_protocol_tensions.sql
-- Persist the Spec 2 tension engine output alongside each recommendation so the
-- tensions band survives a page reload (previously only present in the live
-- /api/recommend response, never stored).
alter table public.protocol_recommendations
  add column if not exists tensions jsonb not null default '[]'::jsonb;
