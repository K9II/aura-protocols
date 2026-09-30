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

  it("does not cascade-delete store credit history when a customer is deleted", () => {
    const table = sql.slice(sql.indexOf("create table if not exists store_credit_ledger"), sql.indexOf("store_credit_ledger_customer_idx"));
    expect(table).toContain("references customers(id)");
    expect(table).not.toContain("on delete cascade");
  });

  it("pins search_path on every function", () => {
    const fns = [...sql.matchAll(/create or replace function [\s\S]*?\$\$;/g)].map((m) => m[0]);
    expect(fns.length).toBeGreaterThanOrEqual(4);
    for (const fn of fns) expect(fn).toContain("set search_path = public, pg_temp");
  });

  it("ships transactional RPCs for commission record/reverse and per-partner payout settlement", () => {
    for (const f of ["record_commission", "reverse_commission", "apply_partner_payout"]) {
      expect(sql).toContain(`create or replace function ${f}`);
    }
    for (const sig of [
      "record_commission(uuid, uuid, integer, integer, integer, text)",
      "reverse_commission(uuid, text)",
      "apply_partner_payout(uuid, date, uuid[], uuid[], integer, integer, integer, integer, text, uuid)",
    ]) {
      expect(sql).toContain(`revoke all on function ${sig} from public, anon, authenticated;`);
    }
    const recordFn = sql.slice(sql.indexOf("create or replace function record_commission"), sql.indexOf("create or replace function reverse_commission"));
    const reverseFn = sql.slice(sql.indexOf("create or replace function reverse_commission"), sql.indexOf("create or replace function apply_partner_payout"));
    const applyFn = sql.slice(sql.indexOf("create or replace function apply_partner_payout"), sql.indexOf("revoke all on function record_commission"));
    for (const fn of [recordFn, reverseFn, applyFn]) {
      expect(fn).toContain("set search_path = public, pg_temp");
      expect(fn).toContain("security invoker");
    }
    // Row locks guard the concurrent-update races these two functions exist to prevent.
    expect(reverseFn).toContain("for update");
    // A refund then a chargeback (or vice versa) on the same paid order deducts only once.
    expect(reverseFn).toContain("if exists (select 1 from commission_adjustments where order_id = p_order) then");
    expect(applyFn).toContain("for update");
  });

  it("guards codes and aliases from colliding across a different partner, re-runnably", () => {
    expect(sql).toContain("create or replace function partner_code_guard() returns trigger language plpgsql");
    expect(sql).toContain("drop trigger if exists partner_code_guard on partners;");
    expect(sql).toContain("create trigger partner_code_guard before insert or update of code on partners");
    expect(sql).toContain("drop trigger if exists partner_code_guard on partner_code_aliases;");
    expect(sql).toContain("create trigger partner_code_guard before insert on partner_code_aliases");
    expect(sql).toContain("errcode = '23505'");
  });
});
