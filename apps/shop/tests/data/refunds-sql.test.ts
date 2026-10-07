import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sql = readFileSync(join(__dirname, "../../supabase/refunds.sql"), "utf8");

describe("refunds.sql", () => {
  it("adds the refund fields to orders", () => {
    for (const c of ["refund_destination", "refund_reason", "refund_note", "refunded_by", "stripe_refund_id", "refund_payment_label"]) expect(sql).toContain(`add column if not exists ${c}`);
    expect(sql).toMatch(/refund_destination in \('card', 'store_credit'\)/);
    expect(sql).toMatch(/refund_reason in \('customer_cancelled', 'damaged', 'not_received', 'wrong_item', 'goodwill', 'other'\)/);
    expect(sql).toMatch(/refunded_by uuid references customers\(id\) on delete set null/);
  });
  it("lets the card part of a refund go to store credit once per order", () => {
    expect(sql).toMatch(/check \(reason in \('payout','order_spend','order_refund','owner_adjust','order_cancel','refund_to_credit'\)\)/);
    expect(sql).toMatch(/where reason in \('order_spend','order_refund','payout','order_cancel','refund_to_credit'\)/);
  });
});
