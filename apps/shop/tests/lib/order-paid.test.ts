import { describe, it, expect, vi, beforeEach } from "vitest";

const getOrderById = vi.fn();
const saveTaxTransactionId = vi.fn();
const getPartnerById = vi.fn();
const createCommission = vi.fn();
const markCommissionClearing = vi.fn();
const spendCredit = vi.fn();
const recordTax = vi.fn();
const sendOrAlert = vi.fn();
const alertOwner = vi.fn();
vi.mock("@/lib/orders", () => ({ getOrderById, saveTaxTransactionId }));
vi.mock("@/lib/partners/data", () => ({ getPartnerById }));
vi.mock("@/lib/partners/ledger", () => ({ createCommission, markCommissionClearing, spendCredit }));
vi.mock("@/lib/commerce", () => ({ getCommerceAdapter: () => ({ recordTax }) }));
vi.mock("@/lib/notify", () => ({ sendOrAlert, alertOwner, alertAddress: () => "owner@example.com" }));

const order = (over: Record<string, unknown> = {}) => ({
  id: "o1", order_number: "AP-1001", customer_id: "u1", email: "j@lab.org", status: "paid", order_items: [],
  subtotal_cents: 28230, partner_discount_cents: 690, shipping_cents: 0, insurance_cents: 550, tax_cents: 0, total_cents: 28090,
  ship_name: "J", ship_line1: "1", ship_line2: null, ship_city: "A", ship_state: "TX", ship_zip: "78701",
  partner_id: null, attributed_by: null, store_credit_cents: 0, tax_calculation_id: null, tax_transaction_id: null,
  shipped_at: null, ...over,
});

describe("afterOrderPaid", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const f of [getOrderById, saveTaxTransactionId, getPartnerById, createCommission, markCommissionClearing, spendCredit, recordTax, sendOrAlert, alertOwner]) f.mockReset();
    spendCredit.mockResolvedValue(true);
  });

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
    expect(markCommissionClearing).not.toHaveBeenCalled();
  });

  it("pays no commission to a partner suspended before payment", async () => {
    getOrderById.mockResolvedValue(order({ partner_id: "p1", attributed_by: "link" }));
    getPartnerById.mockResolvedValue({ id: "p1", status: "suspended", tier_pct: 10 });
    const { afterOrderPaid } = await import("@/lib/order-paid");
    await afterOrderPaid("o1");
    expect(createCommission).not.toHaveBeenCalled();
  });

  it("still creates the commission, then clears it, when the order already shipped before this ran", async () => {
    getOrderById
      .mockResolvedValueOnce(order({ partner_id: "p1", attributed_by: "code" }))
      .mockResolvedValueOnce(order({ partner_id: "p1", attributed_by: "code", status: "shipped", shipped_at: "2026-10-01T00:00:00.000Z" }));
    getPartnerById.mockResolvedValue({ id: "p1", status: "approved", tier_pct: 15 });
    const { afterOrderPaid } = await import("@/lib/order-paid");
    await afterOrderPaid("o1");
    expect(createCommission).toHaveBeenCalledWith({ partnerId: "p1", orderId: "o1", attributedBy: "code", baseCents: 28230 - 690, ratePct: 15 });
    expect(markCommissionClearing).toHaveBeenCalledWith("o1", "2026-10-01T00:00:00.000Z");
  });

  it("never pays commission on a re-read that shows the order is no longer paid or shipped", async () => {
    getOrderById
      .mockResolvedValueOnce(order({ partner_id: "p1", attributed_by: "code" }))
      .mockResolvedValueOnce(order({ partner_id: "p1", attributed_by: "code", status: "refunded" }));
    getPartnerById.mockResolvedValue({ id: "p1", status: "approved", tier_pct: 15 });
    const { afterOrderPaid } = await import("@/lib/order-paid");
    await afterOrderPaid("o1");
    expect(createCommission).not.toHaveBeenCalled();
    expect(markCommissionClearing).not.toHaveBeenCalled();
  });

  it("alerts by name and still sends both emails when the commission step throws", async () => {
    getOrderById.mockResolvedValue(order({ partner_id: "p1", attributed_by: "code" }));
    getPartnerById.mockRejectedValue(new Error("db down"));
    const { afterOrderPaid } = await import("@/lib/order-paid");
    await afterOrderPaid("o1");
    expect(alertOwner).toHaveBeenCalledWith("Commission not recorded for AP-1001", expect.stringContaining("db down"));
    expect(sendOrAlert.mock.calls.map((c) => c[0].to)).toEqual(["j@lab.org", "owner@example.com"]);
  });

  it("alerts by name and still sends both emails when taking store credit throws", async () => {
    getOrderById.mockResolvedValue(order({ store_credit_cents: 18600 }));
    spendCredit.mockRejectedValue(new Error("db down"));
    const { afterOrderPaid } = await import("@/lib/order-paid");
    await afterOrderPaid("o1");
    expect(alertOwner).toHaveBeenCalledWith("Store credit not taken for AP-1001", expect.stringContaining("db down"));
    expect(sendOrAlert.mock.calls.map((c) => c[0].to)).toEqual(["j@lab.org", "owner@example.com"]);
  });

  it("names the store-credit alert when spendCredit reports the balance is short", async () => {
    getOrderById.mockResolvedValue(order({ store_credit_cents: 18600 }));
    spendCredit.mockResolvedValue(false);
    const { afterOrderPaid } = await import("@/lib/order-paid");
    await afterOrderPaid("o1");
    expect(alertOwner).toHaveBeenCalledWith("Store credit not taken for AP-1001", expect.stringContaining("18600"));
  });

  it("records the pre-computed tax and names the alert when recordTax throws", async () => {
    getOrderById.mockResolvedValue(order({ tax_calculation_id: "taxcalc_1" }));
    recordTax.mockRejectedValue(new Error("stripe down"));
    const { afterOrderPaid } = await import("@/lib/order-paid");
    await afterOrderPaid("o1");
    expect(recordTax).toHaveBeenCalledWith("taxcalc_1", "AP-1001");
    expect(alertOwner).toHaveBeenCalledWith("Sales tax not recorded for AP-1001", expect.stringContaining("stripe down"));
    expect(sendOrAlert.mock.calls.map((c) => c[0].to)).toEqual(["j@lab.org", "owner@example.com"]);
  });

  it("alerts that the transaction id is unknown when recordTax reports an already-used reference", async () => {
    getOrderById.mockResolvedValue(order({ tax_calculation_id: "taxcalc_1" }));
    recordTax.mockResolvedValue(null);
    const { afterOrderPaid } = await import("@/lib/order-paid");
    await afterOrderPaid("o1");
    expect(alertOwner).toHaveBeenCalledWith("Sales tax not recorded for AP-1001", "tax recorded earlier; transaction id unknown — reversal will be manual");
    expect(saveTaxTransactionId).not.toHaveBeenCalled();
  });

  it("saves the Stripe tax transaction id so a later refund can reverse it", async () => {
    getOrderById.mockResolvedValue(order({ tax_calculation_id: "taxcalc_1" }));
    recordTax.mockResolvedValue("tax_txn_1");
    const { afterOrderPaid } = await import("@/lib/order-paid");
    await afterOrderPaid("o1");
    expect(saveTaxTransactionId).toHaveBeenCalledWith("o1", "tax_txn_1");
    expect(alertOwner).not.toHaveBeenCalled();
  });

  it("skips recordTax once a tax transaction id is already recorded", async () => {
    getOrderById.mockResolvedValue(order({ tax_calculation_id: "taxcalc_1", tax_transaction_id: "tax_txn_1" }));
    const { afterOrderPaid } = await import("@/lib/order-paid");
    await afterOrderPaid("o1");
    expect(recordTax).not.toHaveBeenCalled();
    expect(alertOwner).not.toHaveBeenCalled();
  });
});
