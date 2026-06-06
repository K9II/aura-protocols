-- supabase/migrations/0004_biometric_extensions.sql
alter table public.biometric_snapshots
  -- sleep detail
  add column if not exists sleep_hrv_rmssd_ms   numeric,
  add column if not exists sleep_hrv_sdnn_ms    numeric,
  add column if not exists sleep_efficiency_pct numeric check (sleep_efficiency_pct between 0 and 100),
  add column if not exists sleep_latency_min    numeric,
  add column if not exists awake_hours          numeric check (awake_hours between 0 and 24),
  -- vitals / physiology
  add column if not exists respiration_bpm      numeric,
  add column if not exists spo2_pct             numeric check (spo2_pct between 50 and 100),
  add column if not exists skin_temp_delta_c    numeric check (skin_temp_delta_c between -5 and 5),
  add column if not exists body_temp_c          numeric,
  add column if not exists systolic_bp          integer,
  add column if not exists diastolic_bp         integer,
  add column if not exists vo2max               numeric,
  -- load / stress
  add column if not exists strain               numeric,
  add column if not exists stress_avg           numeric,
  add column if not exists workout_count        integer,
  -- body composition
  add column if not exists weight_kg            numeric check (weight_kg between 30 and 300),
  add column if not exists bodyfat_pct          numeric check (bodyfat_pct between 3 and 70),
  add column if not exists hydration_ml         integer,
  -- menstrual
  add column if not exists menstrual_phase      text,
  add column if not exists cycle_day            integer check (cycle_day between 1 and 60),
  -- hormone (fertility/cycle hormones — menopause-wedge signals)
  add column if not exists lh_miu_ml            numeric,
  add column if not exists fsh_miu_ml           numeric,
  add column if not exists e3g_ng_ml            numeric,
  add column if not exists pdg_ug_ml            numeric,
  -- nutrition day-summary
  add column if not exists calories_kcal        integer,
  add column if not exists protein_g            numeric,
  add column if not exists carbs_g              numeric,
  add column if not exists fat_g                numeric;

-- day-grain rollup key (lets webhook merge same-day payloads into one row)
alter table public.biometric_snapshots
  add column if not exists metric_date date;
update public.biometric_snapshots set metric_date = captured_at::date where metric_date is null;
create unique index if not exists biometric_snapshots_user_day_uidx
  on public.biometric_snapshots(user_id, metric_date);
