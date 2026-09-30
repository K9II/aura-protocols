import { describe, it, expect, vi, beforeEach } from "vitest";

const customersCreate = vi.fn();
const customersUpdate = vi.fn();
const sessionsCreate = vi.fn();
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({ customers: { create: customersCreate, update: customersUpdate }, checkout: { sessions: { create: sessionsCreate } } }),
}));

const req = {
  orderId: "o1", orderNumber: "AP-1001", siteUrl: "https://auraprotocols.com",
  customer: { email: "j@lab.org", fullName: "Jane", stripeCustomerId: null },
  ship: { name: "Jane", line1: "1 A St", line2: null, city: "Austin", state: "TX" as const, zip: "78701" },
  items: [{ compoundSlug: "bpc-157", compoundName: "BPC-157", variantId: "5mg", strength: "5 mg", packQty: 3, quantity: 2,
    listUnitCents: 14700, packPct: 10, unitPriceCents: 13230, lineTotalCents: 26460, lotNumber: "AP-0001" }],
  shippingCents: 0,
  insuranceCents: 550,
};

describe("commerce adapter", () => {
  beforeEach(() => { vi.resetModules(); customersCreate.mockReset(); customersUpdate.mockReset(); sessionsCreate.mockReset(); });

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
    expect(r).toEqual({ kind: "redirect", url: "https://checkout.stripe.com/c/cs_1", sessionId: "cs_1", stripeCustomerId: "cus_1" });
    expect(customersCreate).toHaveBeenCalledWith(expect.objectContaining({
      email: "j@lab.org", shipping: { name: "Jane", address: { line1: "1 A St", line2: undefined, city: "Austin", state: "TX", postal_code: "78701", country: "US" } },
    }));
    const params = sessionsCreate.mock.calls[0][0];
    expect(params).toMatchObject({
      mode: "payment", customer: "cus_1", client_reference_id: "AP-1001",
      metadata: { order_id: "o1" }, payment_intent_data: { metadata: { order_id: "o1" } },
      automatic_tax: { enabled: true },
      success_url: "https://auraprotocols.com/order/AP-1001?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://auraprotocols.com/checkout",
    });
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
    expect(customersUpdate).toHaveBeenCalledWith("cus_9", expect.objectContaining({ shipping: expect.any(Object) }));
  });
});
