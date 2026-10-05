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

  it("adds the code columns to orders and seeds the 35% cap", () => {
    expect(sql).toContain("add column if not exists discount_code_id");
    expect(sql).toContain("add column if not exists code_discount_cents");
    expect(sql).toMatch(/insert into shop_settings[^;]+35[^;]+on conflict do nothing/);
  });

  it("claims a use atomically: row lock, per-customer lock, limits counted on held + used", () => {
    expect(sql).toContain("create or replace function claim_discount_code");
    expect(sql).toContain("for update");
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain("state in ('held', 'used')");
  });

  it("only claims for an order still awaiting payment", () => {
    expect(sql).toContain("select status into v_status from orders where id = p_order for update");
    expect(sql).toContain("if v_status is distinct from 'awaiting_payment' then return 'inactive'; end if;");
  });

  it("pre-check counts skip the customer's own held uses on orders still awaiting payment (a return from Stripe isn't locked out)", () => {
    const fn = /create or replace function discount_code_use_counts[\s\S]*?\$\$;/.exec(sql)![0];
    expect(fn.match(/join orders o on o\.id = r\.order_id/g)).toHaveLength(2);
    expect(fn.match(/not \(r\.customer_id = p_customer and r\.state = 'held' and o\.status = 'awaiting_payment'\)/g)).toHaveLength(2);
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
    for (const f of ["claim_discount_code(uuid, uuid, uuid, integer, integer)", "discount_code_use_counts(uuid, uuid)", "discount_dashboard()"]) {
      expect(sql).toContain(`revoke all on function ${f} from public, anon, authenticated;`);
    }
    expect(sql).toContain("with (security_invoker = true)");
    expect(sql).toContain("revoke all on discount_code_stats from public, anon, authenticated;");
  });

  it("every column definition in shop_settings ends with a comma (none lost inside a comment)", () => {
    const body = /create table if not exists shop_settings \(([\s\S]*?)\n\);/.exec(sql)![1];
    const lines = body.split("\n").map((l) => l.replace(/--.*$/, "").trim()).filter(Boolean);
    lines.slice(0, -1).forEach((l) => expect(l, l).toMatch(/,$/));
  });
});
