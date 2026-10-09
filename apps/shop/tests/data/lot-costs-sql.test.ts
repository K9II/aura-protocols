import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sql = readFileSync(join(__dirname, "../../supabase/lot-costs.sql"), "utf8");

describe("lot-costs.sql", () => {
  it("lots record supplier, cost and lab fee; a default lab fee setting", () => {
    expect(sql).toMatch(/alter table lots add column if not exists supplier text/);
    expect(sql).toMatch(/alter table lots add column if not exists cost_cents integer/);
    expect(sql).toMatch(/alter table lots add column if not exists test_cents integer/);
    expect(sql).toMatch(/alter table shop_settings add column if not exists lot_test_cents integer not null default 25000/);
    expect(sql).toMatch(/alter table lots add column if not exists freight_cents integer/);
    expect(sql).toMatch(/alter table lots add column if not exists label_cents integer/);
    expect(sql).toMatch(/inbound_per_box_cents integer not null default 1500/);
    expect(sql).toMatch(/label_per_vial_cents integer not null default 40/);
    expect(sql).toMatch(/wholesale_kit_box_cents integer not null default 450/);
    expect(sql).toMatch(/alter table orders add column if not exists packaging_cents integer/);
  });

  it("one recorded fee per payment, private", () => {
    expect(sql).toMatch(/create table if not exists payment_fees[\s\S]*primary key \(order_id, payment\)/);
    expect(sql).toMatch(/payment in \('order', 'deposit', 'balance'\)/);
    expect(sql).toContain("alter table payment_fees enable row level security");
    expect(sql).not.toMatch(/create policy/);
  });

  it("profit counts only sales, held/sold vials, estimates unrecorded fees and skips void commissions", () => {
    expect(sql).toMatch(/x\.kind = 'sale' and x\.status in \('paid', 'shipped'\)/);
    expect(sql).toMatch(/h\.state in \('held', 'sold'\)/);
    expect(sql).toMatch(/p\.amount \* 0\.029 \+ 30/);
    expect(sql).toMatch(/c\.state <> 'void'/);
    expect(sql).toMatch(/nullif\(l\.counted_qty - l\.damaged_qty, 0\)/);
  });

  it("both functions are server-only", () => {
    for (const fn of ["order_profit_rows(timestamptz, timestamptz, uuid)", "admin_profit_summary(timestamptz, timestamptz)"]) {
      expect(sql).toContain(`revoke all on function ${fn} from public, anon, authenticated`);
      expect(sql).toContain(`grant execute on function ${fn} to service_role`);
    }
  });
});
