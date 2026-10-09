-- PRE-LAUNCH ONLY. Wipes wholesale demo data so the demo can be run again:
-- every wholesale order placed by the four test accounts, the production runs
-- that only hold those orders, lots named DEMO-… or QA-WS-…, and the test
-- accounts' wholesale agreement (so the "accept wholesale terms" step shows
-- again). Supplier prices, settings and the catalog are untouched.
-- One transaction: anything unexpected still pointing at this data (a
-- commission, a dispute, a run with a real order) makes it fail and nothing
-- is deleted. Certificate PDFs in the coa bucket are removed separately.
begin;

create temp table demo_accounts on commit drop as
  select u.id from auth.users u where u.email in (
    'assistant@auraprotocols.com', 'support@auraprotocols.com',
    'support+custa@auraprotocols.com', 'support+custb@auraprotocols.com');

create temp table demo_orders on commit drop as
  select o.id from orders o where o.channel = 'wholesale' and o.customer_id in (select id from demo_accounts);

create temp table demo_lots on commit drop as
  select id from lots where lot_number like 'DEMO-%' or lot_number like 'QA-WS-%';

-- Runs whose orders are all demo orders (a run with any other order is kept).
create temp table demo_runs on commit drop as
  select r.id from production_runs r
  where not exists (select 1 from orders o where o.channel = 'wholesale' and o.wholesale_cutoff_on = r.cutoff_on
                    and o.id not in (select id from demo_orders));

delete from production_runs where id in (select id from demo_runs);          -- lines + events cascade
delete from orders where id in (select id from demo_orders);                 -- items, holds, fees cascade
delete from catalog_events where lot_id in (select id from demo_lots);
delete from lots where id in (select id from demo_lots);

delete from wholesale_agreements where customer_id in (select id from demo_accounts);
update customers set wholesale_enabled_at = null where id in (select id from demo_accounts);

select (select count(*) from demo_orders) as orders_deleted,
       (select count(*) from demo_runs) as runs_deleted,
       (select count(*) from demo_lots) as lots_deleted;
commit;
