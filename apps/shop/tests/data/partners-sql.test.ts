import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sql = readFileSync(join(__dirname, "..", "..", "supabase", "partners.sql"), "utf8");

describe("partners.sql", () => {
  const tables = [...sql.matchAll(/create table if not exists (\w+)/g)].map((m) => m[1]);

  it("creates the partner tables", () => {
    expect(tables.sort()).toEqual([
      "commission_adjustments", "commissions", "partner_agreements", "partner_clicks_daily",
      "partner_code_aliases", "partners", "payout_runs", "payouts", "store_credit_ledger",
    ]);
  });

  it("locks every table with RLS", () => {
    for (const t of tables) expect(sql, t).toContain(`alter table ${t} enable row level security;`);
  });

  it("adds partner, credit and tax columns to orders", () => {
    for (const c of ["partner_id", "attributed_by", "partner_discount_cents", "store_credit_cents", "stripe_coupon_id", "tax_calculation_id"]) {
      expect(sql).toContain(`add column if not exists ${c}`);
    }
  });

  it("encodes the tier thresholds and never lowers a tier", () => {
    expect(sql).toContain("when new_total >= 4000000 then 20");
    expect(sql).toContain("when new_total >= 1500000 then 15");
    expect(sql).toContain("tier_pct = greatest(tier_pct,");
  });

  it("spends store credit atomically and only once per order", () => {
    expect(sql).toContain("create or replace function spend_store_credit");
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain("store_credit_ledger_order_once");
  });

  it("keeps the RPC functions away from the anon key and creates a private w9 bucket", () => {
    for (const f of ["record_partner_click(uuid)", "adjust_partner_lifetime(uuid, bigint)", "spend_store_credit(uuid, integer, uuid)"]) {
      expect(sql).toContain(`revoke all on function ${f} from public, anon, authenticated;`);
    }
    expect(sql).toContain("values ('w9', 'w9', false)");
  });
});
