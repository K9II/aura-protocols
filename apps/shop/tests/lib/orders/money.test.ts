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

  describe("a refunded order (r4)", () => {
    const refunded = { ...base, store_credit_cents: 4_000, status: "refunded", refund_reason: "customer_cancelled", refund_destination: "card" as const, stripe_payment_intent: "pi_1" };

    it("ends with Refunded and where the money went", () => {
      const lines = moneyLines(refunded, { code, partnerCode: "QUINN10", paymentLabel: "Visa ••4242" });
      expect(lines.at(-2)).toMatchObject({ label: "Charged" });
      expect(lines.at(-1)).toEqual({ label: "Refunded", note: "$374.39 to Visa ••4242 · $40.00 to store credit", cents: -41_439, kind: "refund" });
    });

    it("says card with no label, and all store credit for a credit destination", () => {
      expect(moneyLines(refunded, { code, partnerCode: null }).at(-1)?.note).toBe("$374.39 to card · $40.00 to store credit");
      expect(moneyLines({ ...refunded, refund_destination: "store_credit" }, { code, partnerCode: null, paymentLabel: "Visa ••4242" }).at(-1)?.note).toBe("$414.39 to store credit");
      expect(moneyLines({ ...refunded, stripe_payment_intent: null, store_credit_cents: 41_439, refund_destination: "store_credit" }, { code, partnerCode: null }).at(-1)?.note).toBe("$414.39 to store credit");
    });

    it("a refund made in the Stripe dashboard (no reason on record) says in Stripe", () => {
      expect(moneyLines({ ...refunded, refund_reason: null, refund_destination: null }, { code, partnerCode: null }).at(-1)).toEqual({ label: "Refunded", note: "in Stripe", cents: -41_439, kind: "refund" });
    });

    it("no Refunded line unless refunded", () => {
      expect(moneyLines({ ...refunded, status: "shipped", refund_reason: null, refund_destination: null }, { code, partnerCode: null }).some((l) => l.kind === "refund")).toBe(false);
    });
  });

  it("leaves out discount lines that are zero", () => {
    const lines = moneyLines({ ...base, partner_id: null, partner_discount_cents: 0, code_discount_cents: 0 }, { code: null, partnerCode: null });
    expect(lines.filter((l) => l.kind === "disc")).toEqual([]);
  });
});
