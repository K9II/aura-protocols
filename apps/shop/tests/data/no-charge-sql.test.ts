import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sql = readFileSync(join(__dirname, "../../supabase/no-charge.sql"), "utf8");
const fn = (name: string) => {
  const at = sql.indexOf(`create or replace function ${name}(`);
  expect(at, name).toBeGreaterThan(-1);
  return sql.slice(at, sql.indexOf("$$;", sql.indexOf("$$", at) + 2));
};

describe("no-charge.sql", () => {
  it("adds kind and the no-charge fields", () => {
    expect(sql).toMatch(/alter table orders add column if not exists kind text not null default 'sale'/);
    expect(sql).toMatch(/check \(kind in \('sale', 'no_charge'\)\)/);
    for (const c of ["retail_value_cents", "no_charge_reason", "no_charge_note", "replaces_order_id", "created_by"]) expect(sql).toContain(`add column if not exists ${c}`);
    expect(sql).toMatch(/alter table order_items add column if not exists retail_unit_cents integer/);
    expect(sql).toMatch(/no_charge_reason in \('seeding', 'replacement', 'sample', 'other'\)/);
    expect(sql).toMatch(/orders_no_charge_zero/); // money must be zero on a no-charge order
  });
  it("hold_vials: a no-charge order may take a hidden strength of a shown product, never a hidden product", () => {
    const f = fn("hold_vials");
    expect(f).toMatch(/v_kind/);
    expect(f).toMatch(/p\.shown is not true or \(v_kind = 'sale' and v\.shown is not true\) or v\.archived_at is not null or v\.slug is null/);
    expect(f).toMatch(/v\.archived_at is not null/);
  });
  it("order-counting functions only count sales", () => {
    for (const name of ["admin_sales_summary", "admin_customer_list", "admin_customer_stats", "discount_dashboard", "email_audience", "admin_email_attribution", "admin_cart_recovery"]) {
      expect(fn(name), name).toMatch(/kind = 'sale'/);
    }
  });
  it("logs no-charge actions in admin_events", () => {
    expect(sql).toMatch(/'no_charge_created', 'no_charge_cancelled'/);
  });
});
