import { describe, it, expect, vi, beforeEach } from "vitest";

const getOrderById = vi.fn();
const saveTaxTransactionId = vi.fn();
const getPartnerById = vi.fn();
const createCommission = vi.fn();
const spendCredit = vi.fn();
const recordTax = vi.fn();
const sendOrAlert = vi.fn();
const alertOwner = vi.fn();
vi.mock("@/lib/orders", () => ({ getOrderById, saveTaxTransactionId }));
vi.mock("@/lib/partners/data", () => ({ getPartnerById }));
vi.mock("@/lib/partners/ledger", () => ({ createCommission, spendCredit }));
vi.mock("@/lib/commerce", () => ({ getCommerceAdapter: () => ({ recordTax }) }));
vi.mock("@/lib/notify", () => ({ sendOrAlert, alertOwner, alertAddress: () => "owner@example.com" }));

const order = (over: Record<string, unknown> = {}) => ({
  id: "o1", order_number: "AP-1001", customer_id: "u1", email: "j@lab.org", status: "paid", order_items: [],
  subtotal_cents: 28230, partner_discount_cents: 690, shipping_cents: 0, insurance_cents: 550, tax_cents: 0, total_cents: 28090,
  ship_name: "J", ship_line1: "1", ship_line2: null, ship_city: "A", ship_state: "TX", ship_zip: "78701",
  partner_id: null, attributed_by: null, store_credit_cents: 0, tax_calculation_id: null, ...over,
});

describe("afterOrderPaid", () => {
  beforeEach(() => { vi.resetModules(); for (const f of [getOrderById, saveTaxTransactionId, getPartnerById, createCommission, spendCredit, recordTax, sendOrAlert, alertOwner]) f.mockReset(); spendCredit.mockResolvedValue(true); });

  it("emails the customer and the owner", async () => {
    getOrderById.mockResolvedValue(order());
    const { afterOrderPaid } = await import("@/lib/order-paid");
    await afterOrderPaid("o1");
    expect(sendOrAlert.mock.calls.map((c) => c[0].to)).toEqual(["j@lab.org", "owner@example.com"]);
    expect(createCommission).not.toHaveBeenCalled();
  });

  it("creates the commission at the partner's current tier on goods after discount only", async () => {
    getOrderById.mockResolvedValue(order({ partner_id: "p1", attributed_by: "code" }));
    getPartnerById.mockResolvedValue({ id: "p1", status: "approved", tier_pct: 15 });
    const { afterOrderPaid } = await import("@/lib/order-paid");
    await afterOrderPaid("o1");
    expect(createCommission).toHaveBeenCalledWith({ partnerId: "p1", orderId: "o1", attributedBy: "code", baseCents: 28230 - 690, ratePct: 15 });
  });

  it("pays no commission to a partner suspended before payment", async () => {
    getOrderById.mockResolvedValue(order({ partner_id: "p1", attributed_by: "link" }));
    getPartnerById.mockResolvedValue({ id: "p1", status: "suspended", tier_pct: 10 });
    const { afterOrderPaid } = await import("@/lib/order-paid");
    await afterOrderPaid("o1");
    expect(createCommission).not.toHaveBeenCalled();
  });

  it("takes the store credit and records the pre-computed tax; alerts on problems", async () => {
    getOrderById.mockResolvedValue(order({ store_credit_cents: 18600, tax_calculation_id: "taxcalc_1" }));
    spendCredit.mockResolvedValue(false);
    recordTax.mockRejectedValue(new Error("stripe down"));
    const { afterOrderPaid } = await import("@/lib/order-paid");
    await afterOrderPaid("o1");
    expect(spendCredit).toHaveBeenCalledWith("u1", 18600, "o1");
    expect(recordTax).toHaveBeenCalledWith("taxcalc_1", "AP-1001");
    expect(alertOwner.mock.calls.map((c) => c[0])).toEqual(["Store credit short on a paid order", "Tax transaction not recorded"]);
  });

  it("saves the Stripe tax transaction id so a later refund can reverse it", async () => {
    getOrderById.mockResolvedValue(order({ tax_calculation_id: "taxcalc_1" }));
    recordTax.mockResolvedValue("tax_txn_1");
    const { afterOrderPaid } = await import("@/lib/order-paid");
    await afterOrderPaid("o1");
    expect(saveTaxTransactionId).toHaveBeenCalledWith("o1", "tax_txn_1");
    expect(alertOwner).not.toHaveBeenCalled();
  });

  it("never pays commission on a re-read that shows the order is no longer paid", async () => {
    getOrderById
      .mockResolvedValueOnce(order({ partner_id: "p1", attributed_by: "code" }))
      .mockResolvedValueOnce(order({ partner_id: "p1", attributed_by: "code", status: "refunded" }));
    getPartnerById.mockResolvedValue({ id: "p1", status: "approved", tier_pct: 15 });
    const { afterOrderPaid } = await import("@/lib/order-paid");
    await afterOrderPaid("o1");
    expect(createCommission).not.toHaveBeenCalled();
  });
});
