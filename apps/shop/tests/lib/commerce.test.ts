import { describe, it, expect, vi, beforeEach } from "vitest";

const customersCreate = vi.fn();
const customersUpdate = vi.fn();
const sessionsCreate = vi.fn();
const sessionsRetrieve = vi.fn();
const sessionsExpire = vi.fn();
const couponsCreate = vi.fn();
const taxCalcCreate = vi.fn();
const taxTxCreate = vi.fn();
const taxTxCreateReversal = vi.fn();
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    customers: { create: customersCreate, update: customersUpdate },
    checkout: { sessions: { create: sessionsCreate, retrieve: sessionsRetrieve, expire: sessionsExpire } },
    coupons: { create: couponsCreate },
    tax: { calculations: { create: taxCalcCreate }, transactions: { createFromCalculation: taxTxCreate, createReversal: taxTxCreateReversal } },
  }),
}));

const req = {
  orderId: "o1", orderNumber: "AP-1001", siteUrl: "https://auraprotocols.com",
  customer: { email: "j@lab.org", fullName: "Jane", stripeCustomerId: null },
  ship: { name: "Jane", line1: "1 A St", line2: null, city: "Austin", state: "TX" as const, zip: "78701" },
  items: [{ compoundSlug: "bpc-157", compoundName: "BPC-157", chemicalClass: "Peptide Fragments", variantId: "5mg", strength: "5 mg", packQty: 3, quantity: 2,
    listUnitCents: 14700, packPct: 10, unitPriceCents: 13230, lineTotalCents: 26460, lotNumber: "AP-0001" }],
  shippingCents: 0,
  insuranceCents: 550,
  partnerDiscountCents: 0,
  lineDiscountsCents: [0],
};

describe("commerce adapter", () => {
  beforeEach(() => {
    vi.resetModules();
    customersCreate.mockReset(); customersUpdate.mockReset(); sessionsCreate.mockReset(); sessionsRetrieve.mockReset(); sessionsExpire.mockReset();
    couponsCreate.mockReset(); taxCalcCreate.mockReset(); taxTxCreate.mockReset(); taxTxCreateReversal.mockReset();
  });

  it("is unavailable without a Stripe key", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const { getCommerceAdapter, CHECKOUT_UNAVAILABLE_MESSAGE } = await import("@/lib/commerce");
    expect(await getCommerceAdapter().createCheckout(req)).toEqual({ kind: "unavailable", message: CHECKOUT_UNAVAILABLE_MESSAGE });
  });

  it("creates a Stripe customer with the shipping address and a tax-enabled Checkout Session", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    customersCreate.mockResolvedValue({ id: "cus_1" });
    sessionsCreate.mockResolvedValue({ id: "cs_1", url: "https://checkout.stripe.com/c/cs_1" });
    const { getCommerceAdapter } = await import("@/lib/commerce");
    const r = await getCommerceAdapter().createCheckout(req);
    expect(r).toEqual({ kind: "redirect", url: "https://checkout.stripe.com/c/cs_1", sessionId: "cs_1", stripeCustomerId: "cus_1", couponId: null });
    expect(customersCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "j@lab.org", shipping: { name: "Jane", address: { line1: "1 A St", line2: undefined, city: "Austin", state: "TX", postal_code: "78701", country: "US" } },
      }),
      { idempotencyKey: "customer-create-o1" },
    );
    const params = sessionsCreate.mock.calls[0][0];
    expect(sessionsCreate.mock.calls[0][1]).toEqual({ idempotencyKey: "checkout-session-o1" });
    expect(params).toMatchObject({
      mode: "payment", customer: "cus_1", client_reference_id: "AP-1001",
      metadata: { order_id: "o1" }, payment_intent_data: { metadata: { order_id: "o1" } },
      automatic_tax: { enabled: true },
      success_url: "https://auraprotocols.com/order/AP-1001?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://auraprotocols.com/checkout",
    });
    expect(params.discounts).toBeUndefined();
    expect(params.line_items).toEqual([
      { quantity: 2, price_data: { currency: "usd", unit_amount: 13230, tax_behavior: "exclusive", product_data: { name: "BPC-157 — 5 mg · 3-pack" } } },
      { quantity: 1, price_data: { currency: "usd", unit_amount: 550, tax_behavior: "exclusive", product_data: { name: "Shipping insurance (transit loss and damage)" } } },
    ]);
    expect(params.shipping_options[0].shipping_rate_data).toMatchObject({ type: "fixed_amount", fixed_amount: { amount: 0, currency: "usd" } });
    expect(params.payment_method_types).toBeUndefined(); // methods come from the Stripe dashboard
  });

  it("reuses an existing Stripe customer and refreshes its shipping address", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    sessionsCreate.mockResolvedValue({ id: "cs_2", url: "https://checkout.stripe.com/c/cs_2" });
    const { getCommerceAdapter } = await import("@/lib/commerce");
    await getCommerceAdapter().createCheckout({ ...req, customer: { ...req.customer, stripeCustomerId: "cus_9" } });
    expect(customersCreate).not.toHaveBeenCalled();
    expect(customersUpdate).toHaveBeenCalledWith("cus_9", expect.objectContaining({ name: "Jane", shipping: expect.any(Object) }));
  });

  it("adds a one-time coupon for the partner discount", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    customersCreate.mockResolvedValue({ id: "cus_1" });
    couponsCreate.mockResolvedValue({ id: "co_1" });
    sessionsCreate.mockResolvedValue({ id: "cs_1", url: "https://checkout.stripe.com/c/cs_1" });
    const { getCommerceAdapter } = await import("@/lib/commerce");
    const r = await getCommerceAdapter().createCheckout({ ...req, partnerDiscountCents: 690, lineDiscountsCents: [690] });
    expect(couponsCreate).toHaveBeenCalledWith(
      { amount_off: 690, currency: "usd", duration: "once", max_redemptions: 1, name: "Discount code" },
      { idempotencyKey: "coupon-o1" },
    );
    expect(sessionsCreate.mock.calls[0][0].discounts).toEqual([{ coupon: "co_1" }]);
    expect(sessionsCreate.mock.calls[0][0].automatic_tax).toEqual({ enabled: true });
    expect(r).toMatchObject({ couponId: "co_1" });
  });

  it("store-credit checkout: tax pre-computed, shipping and tax as lines, one coupon for code + credit", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    customersCreate.mockResolvedValue({ id: "cus_1" });
    couponsCreate.mockResolvedValue({ id: "co_2" });
    sessionsCreate.mockResolvedValue({ id: "cs_2", url: "https://checkout.stripe.com/c/cs_2" });
    const { getCommerceAdapter } = await import("@/lib/commerce");
    await getCommerceAdapter().createCheckout({ ...req, shippingCents: 1500, partnerDiscountCents: 0, credit: { creditCents: 18600, taxCents: 2180 } });
    const params = sessionsCreate.mock.calls[0][0];
    expect(params.automatic_tax).toEqual({ enabled: false });
    expect(params.shipping_options).toBeUndefined();
    expect(params.line_items.map((l: { price_data: { product_data: { name: string }; unit_amount: number } }) => [l.price_data.product_data.name, l.price_data.unit_amount])).toEqual([
      ["BPC-157 — 5 mg · 3-pack", 13230], ["Shipping insurance (transit loss and damage)", 550], ["Tracked shipping (US)", 1500], ["Sales tax", 2180],
    ]);
    expect(couponsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount_off: 18600, name: "Store credit" }),
      { idempotencyKey: "coupon-o1" },
    );
  });

  it("quotes tax on the discounted lines and records it later", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    taxCalcCreate.mockResolvedValue({ id: "taxcalc_1", tax_amount_exclusive: 2180 });
    const { getCommerceAdapter } = await import("@/lib/commerce");
    const q = await getCommerceAdapter().quoteTax({ ship: req.ship, items: req.items, lineDiscountsCents: [690], shippingCents: 0, insuranceCents: 550 });
    expect(q).toEqual({ calculationId: "taxcalc_1", taxCents: 2180 });
    const params = taxCalcCreate.mock.calls[0][0];
    expect(params.customer_details).toEqual({ address: { line1: "1 A St", line2: undefined, city: "Austin", state: "TX", postal_code: "78701", country: "US" }, address_source: "shipping" });
    expect(params.line_items).toEqual([
      { amount: 26460 - 690, reference: "0-bpc-157-5mg-3", tax_behavior: "exclusive" },
      { amount: 550, reference: "insurance", tax_behavior: "exclusive" },
    ]);
    expect(params.shipping_cost).toEqual({ amount: 0, tax_behavior: "exclusive" });
    taxTxCreate.mockResolvedValue({ id: "tax_txn_1" });
    const transactionId = await getCommerceAdapter().recordTax("taxcalc_1", "AP-1001");
    expect(taxTxCreate).toHaveBeenCalledWith(
      { calculation: "taxcalc_1", reference: "AP-1001" },
      { idempotencyKey: "tax-tx-AP-1001" },
    );
    expect(transactionId).toBe("tax_txn_1");
  });

  it("treats a Stripe rejection for an already-recorded reference as success", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    taxTxCreate.mockRejectedValue(Object.assign(new Error("A transaction with reference 'AP-1001' already exists."), { type: "StripeInvalidRequestError" }));
    const { getCommerceAdapter } = await import("@/lib/commerce");
    await expect(getCommerceAdapter().recordTax("taxcalc_1", "AP-1001")).resolves.toBeNull();
  });

  it("lets a genuine Stripe error from recordTax propagate", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    taxTxCreate.mockRejectedValue(Object.assign(new Error("calculation has expired"), { type: "StripeInvalidRequestError" }));
    const { getCommerceAdapter } = await import("@/lib/commerce");
    await expect(getCommerceAdapter().recordTax("taxcalc_1", "AP-1001")).rejects.toThrow("calculation has expired");
  });

  it("does not treat a non-Stripe error mentioning \"already\" as a duplicate reference", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    taxTxCreate.mockRejectedValue(new Error("network already closed"));
    const { getCommerceAdapter } = await import("@/lib/commerce");
    await expect(getCommerceAdapter().recordTax("taxcalc_1", "AP-1001")).rejects.toThrow("network already closed");
  });

  it("reverses a recorded tax transaction in full", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    const { getCommerceAdapter } = await import("@/lib/commerce");
    await getCommerceAdapter().reverseTax("tax_txn_1");
    expect(taxTxCreateReversal).toHaveBeenCalledWith(
      { mode: "full", original_transaction: "tax_txn_1", reference: "tax_txn_1-refund" },
      { idempotencyKey: "tax-reversal-tax_txn_1" },
    );
  });

  it("recordTax and reverseTax are no-ops without a Stripe key", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const { getCommerceAdapter } = await import("@/lib/commerce");
    await expect(getCommerceAdapter().recordTax("taxcalc_1", "AP-1001")).resolves.toBeNull();
    await expect(getCommerceAdapter().reverseTax("tax_txn_1")).resolves.toBeUndefined();
    expect(taxTxCreate).not.toHaveBeenCalled();
    expect(taxTxCreateReversal).not.toHaveBeenCalled();
  });

  const pay = { orderId: "o9", orderNumber: "AP-1050", siteUrl: "https://auraprotocols.com",
    customer: { email: "j@lab.org", fullName: "Jane", stripeCustomerId: "cus_1" }, ship: req.ship,
    payment: "deposit" as const, label: "Deposit (40%) — order AP-1050 · 3 kits", amountCents: 60600, cancelPath: "/wholesale" };

  it("createPaymentCheckout charges one fixed amount, no automatic tax, tagged with the payment kind", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    sessionsCreate.mockResolvedValue({ id: "cs_9", url: "https://stripe/cs_9" });
    const { getCommerceAdapter } = await import("@/lib/commerce");
    const r = await getCommerceAdapter().createPaymentCheckout(pay);
    expect(r).toEqual({ kind: "redirect", url: "https://stripe/cs_9", sessionId: "cs_9", stripeCustomerId: "cus_1", couponId: null });
    const [params, opts] = sessionsCreate.mock.calls[0];
    expect(params).toMatchObject({
      mode: "payment", customer: "cus_1", client_reference_id: "AP-1050",
      metadata: { order_id: "o9", payment: "deposit" }, payment_intent_data: { metadata: { order_id: "o9", payment: "deposit" } },
      automatic_tax: { enabled: false }, cancel_url: "https://auraprotocols.com/wholesale",
      success_url: "https://auraprotocols.com/order/AP-1050?session_id={CHECKOUT_SESSION_ID}",
    });
    expect(params.line_items).toEqual([{ quantity: 1, price_data: { currency: "usd", unit_amount: 60600, tax_behavior: "exclusive", product_data: { name: pay.label } } }]);
    expect(params.shipping_options).toBeUndefined();
    expect(opts).toEqual({ idempotencyKey: "deposit-session-o9-0" });
  });

  it("createPaymentCheckout is unavailable without a Stripe key", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const { getCommerceAdapter, CHECKOUT_UNAVAILABLE_MESSAGE } = await import("@/lib/commerce");
    expect(await getCommerceAdapter().createPaymentCheckout(pay)).toEqual({ kind: "unavailable", message: CHECKOUT_UNAVAILABLE_MESSAGE });
  });

  it("expireCheckout closes an open Stripe page and reports a page that was already paid", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    const { getCommerceAdapter } = await import("@/lib/commerce");
    sessionsRetrieve.mockResolvedValueOnce({ id: "cs_1", status: "open" });
    expect(await getCommerceAdapter().expireCheckout("cs_1")).toBe("expired");
    expect(sessionsExpire).toHaveBeenCalledWith("cs_1");
    sessionsExpire.mockClear();
    sessionsRetrieve.mockResolvedValueOnce({ id: "cs_2", status: "complete" });
    expect(await getCommerceAdapter().expireCheckout("cs_2")).toBe("complete");
    sessionsRetrieve.mockResolvedValueOnce({ id: "cs_3", status: "expired" });
    expect(await getCommerceAdapter().expireCheckout("cs_3")).toBe("expired");
    expect(sessionsExpire).not.toHaveBeenCalled();
  });
});
