alter table public.profiles
  add column if not exists age                 integer check (age between 13 and 120),
  add column if not exists biological_sex      text check (biological_sex in ('male','female','other','prefer_not_to_say')),
  add column if not exists weight_kg           numeric check (weight_kg between 30 and 300),
  add column if not exists activity_level      text check (activity_level in ('sedentary','moderate','active','athlete')),
  add column if not exists primary_goal        text check (primary_goal in ('recovery','body_comp','sleep_stress','performance','longevity')),
  add column if not exists current_medications text,
  add column if not exists using_peptides      boolean not null default false,
  add column if not exists peptides_detail     text,
  add column if not exists interested_in_rx    boolean not null default false,
  add column if not exists budget_tier         text check (budget_tier in ('50_100','100_200','200_plus')),
  add column if not exists onboarding_complete boolean not null default false;

alter table public.protocol_recommendations
  drop constraint if exists protocol_recommendations_template_check;
alter table public.protocol_recommendations
  add constraint protocol_recommendations_template_check
    check (template in ('RECOVERY','GH','SLEEP_STRESS','METABOLIC'));

create index if not exists profiles_onboarding_idx on public.profiles(id, onboarding_complete);
