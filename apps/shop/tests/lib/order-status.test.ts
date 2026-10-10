import { describe, it, expect } from "vitest";
import { canTransition, ORDER_STATUSES, STATUS_LABEL, statusLabelFor } from "@/lib/order-status";

describe("order status machine", () => {
  it("allows exactly the designed transitions", () => {
    const allowed = ORDER_STATUSES.flatMap((from) => ORDER_STATUSES.filter((to) => canTransition(from, to)).map((to) => `${from}>${to}`));
    expect(allowed.sort()).toEqual([
      "awaiting_payment>cancelled", "awaiting_payment>deposit_paid", "awaiting_payment>paid", "awaiting_payment>processing",
      "balance_due>cancelled", "balance_due>paid",
      "deposit_paid>balance_due", "deposit_paid>refunded",
      "paid>refunded", "paid>shipped",
      "processing>cancelled", "processing>deposit_paid", "processing>paid",
      "shipped>refunded",
    ]);
  });

  it("labels the wholesale states", () => {
    expect(STATUS_LABEL.deposit_paid).toBe("Deposit paid — in production");
    expect(STATUS_LABEL.balance_due).toBe("Balance due");
  });

  it("labels every status for customers", () => {
    for (const s of ORDER_STATUSES) expect(STATUS_LABEL[s]).toBeTruthy();
    expect(STATUS_LABEL.paid).toBe("Paid — preparing to ship");
  });

  it("statusLabelFor calls a cancelled no-charge order what it is", () => {
    expect(statusLabelFor({ status: "refunded", kind: "no_charge" })).toBe("Cancelled (no charge)");
    expect(statusLabelFor({ status: "refunded", kind: "sale" })).toBe("Refunded");
    expect(statusLabelFor({ status: "paid", kind: "no_charge" })).toBe(STATUS_LABEL.paid);
  });
});
