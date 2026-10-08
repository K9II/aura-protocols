-- Checkout research verification (spec 2026-10-07-checkout-human-check-design.md).
-- Asked once, on a customer's first order (processor site rules). The field
-- list matches RESEARCH_FIELDS in src/lib/account/research.ts.

alter table customers add column if not exists research_field text;
alter table customers drop constraint if exists customers_research_field_check;
alter table customers add constraint customers_research_field_check check (research_field is null or research_field in (
  'independent', 'pharmacology', 'molecular_biology', 'medicinal_chemistry',
  'biochemistry', 'analytical_chemistry', 'cell_biology', 'other'));
alter table customers add column if not exists research_org text;
alter table customers drop constraint if exists customers_research_org_check;
alter table customers add constraint customers_research_org_check check (research_org is null or char_length(research_org) between 1 and 120);
alter table customers add column if not exists research_verified_at timestamptz;
