import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sql = readFileSync(join(__dirname, "../../supabase/wholesale-runs.sql"), "utf8");

describe("wholesale-runs.sql", () => {
  it("creates runs keyed by cutoff, lines unique per strength, events with a unique key", () => {
    expect(sql).toMatch(/create table if not exists production_runs[\s\S]*cutoff_on\s+date not null unique/);
    expect(sql).toMatch(/unique \(run_id, slug, variant_id\)/);
    expect(sql).toMatch(/event_key\s+text unique/);
  });
  it("passing a line puts the lot live and holds vials in one function", () => {
    expect(sql).toMatch(/create or replace function pass_run_line/);
    expect(sql).toMatch(/admin_lot_live\(/);
    expect(sql).toMatch(/insert into lot_holds/);
    expect(sql).toMatch(/revoke all on function pass_run_line\(uuid, uuid\) from public, anon, authenticated/);
  });
  it("a refund from deposit_paid releases held vials", () => {
    expect(sql).toMatch(/new\.status = 'refunded' and old\.status = 'deposit_paid'/);
  });
  it("RLS on every new table, customer_events gains wholesale_on/off", () => {
    for (const t of ["production_runs", "production_run_lines", "production_run_events"]) expect(sql).toContain(`alter table ${t} enable row level security`);
    expect(sql).toMatch(/'wholesale_on', 'wholesale_off'/);
    expect(sql).toMatch(/catalog_events_kind_check[\s\S]*'strength_deleted', 'wholesale_on', 'wholesale_off'/);
    expect(sql).toContain("'lot_failed_emailed'");
  });
});
