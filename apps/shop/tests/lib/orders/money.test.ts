import { describe, it, expect } from "vitest";
import { codeText, moneyLines } from "@/lib/orders/money";

const base = { subtotal_cents: 44_500, partner_discount_cents: 6_453, code_discount_cents: 2_003, shipping_cents: 0, insurance_cents: 550, tax_cents: 2_842, total_cents: 41_439, store_credit_cents: 0, new_account_discount: false, partner_id: "p1" };
const code = { code: "SPRING20", kind: "order_pct", value: 5, stack_on_top: true, free_shipping: false };

describe("moneyLines", () => {
  it("splits the code's share from the other discount and ends with Charged", () => {
    const lines = moneyLines(base, { code, partnerCode: "QUINN10" });
    expect(lines.map((l) => [l.label, l.cents])).toEqual([
      ["Goods", 44_500], ["Partner discount", -4_450], ["Code", -2_003], ["Shipping", 0], ["Insurance", 550], ["Tax", 2_842],
      ["Total", 41_439], ["Store credit applied", 0], ["Charged", 41_439],
    ]);
    expect(lines.find((l) => l.label === "Partner discount")?.note).toBe("QUINN10 · 10%");
    expect(lines.find((l) => l.label === "Code")?.note).toBe("SPRING20 · 5% order, on top");
  });

  it("codeText describes what the code does", () => {
    expect(codeText({ kind: "order_pct", value: 5, stack_on_top: true, free_shipping: false })).toBe("5% order, on top");
    expect(codeText({ kind: "item_pct", value: 20, stack_on_top: false, free_shipping: true })).toBe("20% items + free shipping");
    expect(codeText({ kind: "order_amount", value: 1000, stack_on_top: false, free_shipping: false })).toBe("$10.00 off");
    expect(codeText({ kind: "free_shipping", value: 0, stack_on_top: false, free_shipping: false })).toBe("free shipping");
  });

  it("names the new-account offer and subtracts store credit from Charged", () => {
    const lines = moneyLines({ ...base, partner_id: null, new_account_discount: true, code_discount_cents: 0, partner_discount_cents: 11_125, store_credit_cents: 1_000 }, { code: null, partnerCode: null });
    expect(lines.find((l) => l.kind === "disc")?.label).toBe("New-account offer");
    expect(lines.some((l) => l.label === "Code")).toBe(false);
    expect(lines.at(-1)).toMatchObject({ label: "Charged", cents: 40_439 });
  });

  it("leaves out discount lines that are zero", () => {
    const lines = moneyLines({ ...base, partner_id: null, partner_discount_cents: 0, code_discount_cents: 0 }, { code: null, partnerCode: null });
    expect(lines.filter((l) => l.kind === "disc")).toEqual([]);
  });
});
