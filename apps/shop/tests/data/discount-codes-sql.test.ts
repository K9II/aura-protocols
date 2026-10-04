import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sql = readFileSync(join(__dirname, "..", "..", "supabase", "discount-codes.sql"), "utf8");

describe("discount-codes.sql", () => {
  const tables = [...sql.matchAll(/create table if not exists (\w+)/g)].map((m) => m[1]);

  it("creates the discount tables", () => {
    expect(tables.sort()).toEqual(["code_attempts", "code_redemptions", "discount_batches", "discount_code_events", "discount_codes", "shop_settings"]);
  });

  it("locks every table with RLS", () => {
    for (const t of tables) expect(sql, t).toContain(`alter table ${t} enable row level security;`);
  });

  it("adds the code columns to orders and seeds the 30% cap", () => {
    expect(sql).toContain("add column if not exists discount_code_id");
    expect(sql).toContain("add column if not exists code_discount_cents");
    expect(sql).toMatch(/insert into shop_settings[^;]+30[^;]+on conflict do nothing/);
  });

  it("claims a use atomically: row lock, per-customer lock, limits counted on held + used", () => {
    expect(sql).toContain("create or replace function claim_discount_code");
    expect(sql).toContain("for update");
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain("state in ('held', 'used')");
  });

  it("settles uses from the order status: paid/shipped → used, cancelled → released", () => {
    expect(sql).toContain("create trigger settle_code_on_order_status after update of status on orders");
    expect(sql).toMatch(/new\.status in \('paid', 'shipped'\)[\s\S]+set state = 'used'/);
    expect(sql).toMatch(/new\.status = 'cancelled'[\s\S]+set state = 'released'/);
  });

  it("refuses a discount code that clashes with a partner code or alias", () => {
    expect(sql).toContain("create trigger discount_code_namespace");
    expect(sql).toContain("from partners where code = new.code");
    expect(sql).toContain("from partner_code_aliases where code = new.code");
  });

  it("keeps functions and the stats view away from the anon key", () => {
    for (const f of ["claim_discount_code(uuid, uuid, uuid, integer, integer)", "discount_dashboard()"]) {
      expect(sql).toContain(`revoke all on function ${f} from public, anon, authenticated;`);
    }
    expect(sql).toContain("with (security_invoker = true)");
    expect(sql).toContain("revoke all on discount_code_stats from public, anon, authenticated;");
  });
});
