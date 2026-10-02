import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Compound } from "@/data/catalog";

const getCustomer = vi.fn();
const createPendingOrder = vi.fn();
const attachCheckoutSession = vi.fn();
const transitionOrder = vi.fn();
const saveShipAddress = vi.fn();
const saveStripeCustomerId = vi.fn();
const saveStripeCoupon = vi.fn();
const createCheckout = vi.fn();
const quoteTax = vi.fn();
const resolveAttribution = vi.fn();
const creditBalance = vi.fn();
const spendCredit = vi.fn();
const afterOrderPaid = vi.fn();
const alertOwner = vi.fn();
const listOpenOrdersForCustomer = vi.fn();
const expireCheckout = vi.fn();
vi.mock("@/lib/dal", () => ({ getCustomer }));
vi.mock("@/lib/orders", () => ({ createPendingOrder, attachCheckoutSession, transitionOrder, saveShipAddress, saveStripeCustomerId, saveStripeCoupon, listOpenOrdersForCustomer }));
vi.mock("@/lib/commerce", () => ({ getCommerceAdapter: () => ({ createCheckout, quoteTax, expireCheckout }), STRIPE_MIN_CHARGE_CENTS: 50 }));
vi.mock("@/lib/partners/attribution", () => ({ resolveAttribution }));
vi.mock("@/lib/partners/ledger", () => ({ creditBalance, spendCredit }));
vi.mock("@/lib/order-paid", () => ({ afterOrderPaid }));
vi.mock("@/lib/notify", () => ({ alertOwner }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

const tested = { lot: "AP-0001", purityPct: 99.5, method: "HPLC" as const, testedOn: "2026-09-01", coaFile: "/coa/AP-0001.pdf" };
vi.mock("@/data/catalog", () => ({
  compounds: [{
    slug: "bpc-157", name: "BPC-157", chemicalClass: "Peptide Fragments", identity: {}, form: "", storage: "", vialMl: 3,
    variants: [{ id: "5mg", strength: "5 mg", priceUsd: 49, stock: "in" }],
    packDiscounts: [{ qty: 1, pct: 0 }, { qty: 3, pct: 10 }], currentLot: tested,
  }] satisfies Compound[],
}));

const customer = { id: "u1", email: "j@lab.org", emailConfirmed: true, fullName: "Jane", organization: null, isOwner: false, stripeCustomerId: null, ship: null };
const input = {
  lines: [{ slug: "bpc-157", variantId: "5mg", packQty: 1, quantity: 1 }],
  ship: { name: "Jane", line1: "1 A St", line2: "", city: "Austin", state: "TX", zip: "78701" },
  ruoConfirmed: true,
};
const redirect = { kind: "redirect", url: "https://checkout.stripe.com/x", sessionId: "cs_1", stripeCustomerId: "cus_1", couponId: null };

describe("startCheckoutAction", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const f of [getCustomer, createPendingOrder, attachCheckoutSession, transitionOrder, saveShipAddress, saveStripeCustomerId, saveStripeCoupon,
      createCheckout, quoteTax, resolveAttribution, creditBalance, spendCredit, afterOrderPaid, alertOwner, listOpenOrdersForCustomer, expireCheckout]) f.mockReset();
    listOpenOrdersForCustomer.mockResolvedValue([]);
    resolveAttribution.mockResolvedValue({ attribution: null });
    createPendingOrder.mockResolvedValue({ id: "o1", orderNumber: "AP-1001" });
    transitionOrder.mockResolvedValue(true);
  });

  it("requires a signed-in, verified customer", async () => {
    getCustomer.mockResolvedValue(null);
    const { startCheckoutAction } = await import("@/app/checkout/actions");
    expect((await startCheckoutAction(input)).error).toMatch(/sign in/i);
    getCustomer.mockResolvedValue({ ...customer, emailConfirmed: false });
    expect((await startCheckoutAction(input)).error).toMatch(/verify/i);
  });

  it("requires the per-order research-use confirmation", async () => {
    getCustomer.mockResolvedValue(customer);
    const { startCheckoutAction } = await import("@/app/checkout/actions");
    expect((await startCheckoutAction({ ...input, ruoConfirmed: false })).error).toBeTruthy();
    expect(createPendingOrder).not.toHaveBeenCalled();
  });

  it("refuses items that can't be sold and creates nothing", async () => {
    getCustomer.mockResolvedValue(customer);
    const { startCheckoutAction } = await import("@/app/checkout/actions");
    const r = await startCheckoutAction({ ...input, lines: [{ slug: "nope", variantId: "5mg", packQty: 1, quantity: 1 }] });
    expect(r.rejected).toEqual([{ slug: "nope", variantId: "5mg", reason: "unknown" }]);
    expect(createPendingOrder).not.toHaveBeenCalled();
  });

  it("creates the order from server prices, starts Stripe and returns its URL", async () => {
    getCustomer.mockResolvedValue(customer);
    createCheckout.mockResolvedValue(redirect);
    const { startCheckoutAction } = await import("@/app/checkout/actions");
    expect(await startCheckoutAction(input)).toEqual({ url: "https://checkout.stripe.com/x" });
    expect(createPendingOrder.mock.calls[0][0].priced).toMatchObject({ subtotalCents: 4900, shippingCents: 1500, insuranceCents: 550, partnerDiscountCents: 0 });
    expect(createCheckout.mock.calls[0][0]).toMatchObject({ shippingCents: 1500, insuranceCents: 550, partnerDiscountCents: 0, lineDiscountsCents: [0] });
    expect(attachCheckoutSession).toHaveBeenCalledWith("o1", "cs_1");
    expect(saveStripeCustomerId).toHaveBeenCalledWith("u1", "cus_1");
    expect(saveStripeCoupon).not.toHaveBeenCalled();
  });

  it("applies a partner code: 10% off the single vial, attributed to the partner", async () => {
    getCustomer.mockResolvedValue(customer);
    resolveAttribution.mockResolvedValue({ attribution: { partnerId: "p1", code: "SMITHLAB", via: "code" } });
    createCheckout.mockResolvedValue({ ...redirect, couponId: "co_1" });
    const { startCheckoutAction } = await import("@/app/checkout/actions");
    await startCheckoutAction({ ...input, partnerCode: "smithlab" });
    expect(resolveAttribution).toHaveBeenCalledWith({ typedCode: "smithlab", refCookie: undefined, buyerCustomerId: "u1" });
    expect(createPendingOrder.mock.calls[0][0]).toMatchObject({ partner: { partnerId: "p1", attributedBy: "code" }, priced: { partnerDiscountCents: 490 } });
    expect(createCheckout.mock.calls[0][0]).toMatchObject({ partnerDiscountCents: 490, lineDiscountsCents: [490] });
    expect(saveStripeCoupon).toHaveBeenCalledWith("o1", "co_1");
  });

  it("a link attribution earns commission but gives no discount", async () => {
    getCustomer.mockResolvedValue(customer);
    resolveAttribution.mockResolvedValue({ attribution: { partnerId: "p2", code: "BENCHNOTES", via: "link" } });
    createCheckout.mockResolvedValue(redirect);
    const { startCheckoutAction } = await import("@/app/checkout/actions");
    await startCheckoutAction(input);
    expect(createPendingOrder.mock.calls[0][0]).toMatchObject({ partner: { partnerId: "p2", attributedBy: "link" }, priced: { partnerDiscountCents: 0 } });
  });

  it("stops with a message when a typed code can't be used", async () => {
    getCustomer.mockResolvedValue(customer);
    resolveAttribution.mockResolvedValue({ attribution: null, codeError: "This code can't be used." });
    const { startCheckoutAction } = await import("@/app/checkout/actions");
    expect(await startCheckoutAction({ ...input, partnerCode: "NOPE1" })).toEqual({ error: "This code can't be used.", codeError: "This code can't be used." });
    expect(createPendingOrder).not.toHaveBeenCalled();
  });

  it("store credit covering everything: no Stripe, credit spent, order paid", async () => {
    getCustomer.mockResolvedValue(customer);
    creditBalance.mockResolvedValue(50000);
    quoteTax.mockResolvedValue({ calculationId: "taxcalc_1", taxCents: 426 });
    spendCredit.mockResolvedValue(true);
    const { startCheckoutAction } = await import("@/app/checkout/actions");
    expect(await startCheckoutAction({ ...input, useCredit: true })).toEqual({ url: "/order/AP-1001" });
    const total = 4900 + 1500 + 550 + 426;
    expect(createPendingOrder.mock.calls[0][0]).toMatchObject({ storeCreditCents: total, taxCents: 426, taxCalculationId: "taxcalc_1" });
    expect(spendCredit).toHaveBeenCalledWith("u1", total, "o1");
    expect(transitionOrder).toHaveBeenCalledWith("o1", "awaiting_payment", "paid");
    expect(afterOrderPaid).toHaveBeenCalledWith("o1");
    expect(createCheckout).not.toHaveBeenCalled();
  });

  it("a fully-credit order that can't be marked paid is cancelled and alerts the owner instead of redirecting", async () => {
    getCustomer.mockResolvedValue(customer);
    creditBalance.mockResolvedValue(50000);
    quoteTax.mockResolvedValue({ calculationId: "taxcalc_1", taxCents: 426 });
    spendCredit.mockResolvedValue(true);
    transitionOrder.mockResolvedValueOnce(false); // the "paid" transition fails
    transitionOrder.mockResolvedValueOnce(true); // the follow-up cancel succeeds
    const { startCheckoutAction } = await import("@/app/checkout/actions");
    const r = await startCheckoutAction({ ...input, useCredit: true });
    expect(r.url).toBeUndefined();
    expect(r.error).toBeTruthy();
    expect(transitionOrder).toHaveBeenNthCalledWith(1, "o1", "awaiting_payment", "paid");
    expect(transitionOrder).toHaveBeenNthCalledWith(2, "o1", "awaiting_payment", "cancelled");
    expect(alertOwner).toHaveBeenCalled();
    expect(afterOrderPaid).not.toHaveBeenCalled();
  });

  it("a fully-credit order still redirects if afterOrderPaid fails, but alerts the owner", async () => {
    getCustomer.mockResolvedValue(customer);
    creditBalance.mockResolvedValue(50000);
    quoteTax.mockResolvedValue({ calculationId: "taxcalc_1", taxCents: 426 });
    spendCredit.mockResolvedValue(true);
    afterOrderPaid.mockRejectedValue(new Error("email send failed"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { startCheckoutAction } = await import("@/app/checkout/actions");
    expect(await startCheckoutAction({ ...input, useCredit: true })).toEqual({ url: "/order/AP-1001" });
    expect(transitionOrder).toHaveBeenCalledWith("o1", "awaiting_payment", "paid");
    expect(alertOwner).toHaveBeenCalled();
  });

  it("partial store credit leaves at least Stripe's $0.50 minimum to pay, and is held before Stripe starts", async () => {
    getCustomer.mockResolvedValue(customer);
    const total = 4900 + 1500 + 550 + 426;
    creditBalance.mockResolvedValue(total - 20); // would leave $0.20
    quoteTax.mockResolvedValue({ calculationId: "taxcalc_1", taxCents: 426 });
    spendCredit.mockResolvedValue(true);
    createCheckout.mockResolvedValue(redirect);
    const { startCheckoutAction } = await import("@/app/checkout/actions");
    await startCheckoutAction({ ...input, useCredit: true });
    expect(createPendingOrder.mock.calls[0][0]).toMatchObject({ storeCreditCents: total - 50 });
    expect(spendCredit).toHaveBeenCalledWith("u1", total - 50, "o1");
    expect(spendCredit.mock.invocationCallOrder[0]).toBeLessThan(createCheckout.mock.invocationCallOrder[0]);
    expect(createCheckout.mock.calls[0][0].credit).toEqual({ creditCents: total - 50, taxCents: 426 });
  });

  it("a partial store credit spend that fails (balance changed) cancels immediately without starting Stripe", async () => {
    getCustomer.mockResolvedValue(customer);
    const total = 4900 + 1500 + 550 + 426;
    creditBalance.mockResolvedValue(total - 20);
    quoteTax.mockResolvedValue({ calculationId: "taxcalc_1", taxCents: 426 });
    spendCredit.mockResolvedValue(false);
    const { startCheckoutAction } = await import("@/app/checkout/actions");
    expect(await startCheckoutAction({ ...input, useCredit: true })).toEqual({ error: "Your store credit balance changed — please review your order again." });
    expect(spendCredit).toHaveBeenCalledWith("u1", total - 50, "o1");
    expect(transitionOrder).toHaveBeenCalledWith("o1", "awaiting_payment", "cancelled");
    expect(createCheckout).not.toHaveBeenCalled();
  });

  it("cancels the pending order if Stripe fails, and charges nothing", async () => {
    getCustomer.mockResolvedValue(customer);
    createCheckout.mockRejectedValue(new Error("stripe down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { startCheckoutAction } = await import("@/app/checkout/actions");
    expect((await startCheckoutAction(input)).error).toMatch(/try again/i);
    expect(transitionOrder).toHaveBeenCalledWith("o1", "awaiting_payment", "cancelled");
  });
});

describe("startCheckoutAction - abandoned checkouts", () => {
  const old = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  beforeEach(() => {
    vi.resetModules();
    for (const f of [getCustomer, createPendingOrder, attachCheckoutSession, transitionOrder, saveShipAddress, saveStripeCustomerId, saveStripeCoupon,
      createCheckout, quoteTax, resolveAttribution, creditBalance, spendCredit, afterOrderPaid, alertOwner, listOpenOrdersForCustomer, expireCheckout]) f.mockReset();
    getCustomer.mockResolvedValue(customer);
    resolveAttribution.mockResolvedValue({ attribution: null });
    createPendingOrder.mockResolvedValue({ id: "o1", orderNumber: "AP-1001" });
    transitionOrder.mockResolvedValue(true);
    createCheckout.mockResolvedValue(redirect);
    listOpenOrdersForCustomer.mockResolvedValue([]);
  });

  it("expires the earlier Stripe page and cancels that order before reading credit (returns held credit)", async () => {
    listOpenOrdersForCustomer.mockResolvedValue([{ id: "o0", order_number: "AP-1000", stripe_session_id: "cs_0", created_at: old }]);
    expireCheckout.mockResolvedValue("expired");
    creditBalance.mockResolvedValue(0);
    const { startCheckoutAction } = await import("@/app/checkout/actions");
    await startCheckoutAction({ ...input, useCredit: true });
    expect(expireCheckout).toHaveBeenCalledWith("cs_0");
    expect(transitionOrder).toHaveBeenCalledWith("o0", "awaiting_payment", "cancelled");
    const cancelAt = transitionOrder.mock.invocationCallOrder[transitionOrder.mock.calls.findIndex((c) => c[0] === "o0")];
    expect(cancelAt).toBeLessThan(creditBalance.mock.invocationCallOrder[0]);
  });

  it("leaves an earlier order alone when its Stripe page was actually paid", async () => {
    listOpenOrdersForCustomer.mockResolvedValue([{ id: "o0", order_number: "AP-1000", stripe_session_id: "cs_0", created_at: old }]);
    expireCheckout.mockResolvedValue("complete");
    const { startCheckoutAction } = await import("@/app/checkout/actions");
    await startCheckoutAction(input);
    expect(transitionOrder).not.toHaveBeenCalledWith("o0", "awaiting_payment", "cancelled");
  });

  it("cancels an earlier order with no Stripe page only once it is 10+ minutes old", async () => {
    listOpenOrdersForCustomer.mockResolvedValue([
      { id: "o0", order_number: "AP-1000", stripe_session_id: null, created_at: old },
      { id: "o9", order_number: "AP-1009", stripe_session_id: null, created_at: new Date().toISOString() },
    ]);
    const { startCheckoutAction } = await import("@/app/checkout/actions");
    await startCheckoutAction(input);
    expect(transitionOrder).toHaveBeenCalledWith("o0", "awaiting_payment", "cancelled");
    expect(transitionOrder).not.toHaveBeenCalledWith("o9", "awaiting_payment", "cancelled");
  });

  it("expires the Stripe page it just created if saving the session fails, so it cannot be paid", async () => {
    attachCheckoutSession.mockRejectedValue(new Error("db down"));
    expireCheckout.mockResolvedValue("expired");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { startCheckoutAction } = await import("@/app/checkout/actions");
    expect((await startCheckoutAction(input)).error).toMatch(/try again/i);
    expect(expireCheckout).toHaveBeenCalledWith("cs_1");
    expect(transitionOrder).toHaveBeenCalledWith("o1", "awaiting_payment", "cancelled");
  });

  it("still sends the customer to Stripe when only the bookkeeping saves fail, and alerts the owner", async () => {
    createCheckout.mockResolvedValue({ ...redirect, couponId: "co_1" });
    saveStripeCoupon.mockRejectedValue(new Error("db down"));
    saveShipAddress.mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { startCheckoutAction } = await import("@/app/checkout/actions");
    expect((await startCheckoutAction(input)).url).toBe(redirect.url);
    expect(transitionOrder).not.toHaveBeenCalledWith("o1", "awaiting_payment", "cancelled");
    expect(alertOwner).toHaveBeenCalled();
  });

  it("alerts the owner if that Stripe page cannot be closed", async () => {
    attachCheckoutSession.mockRejectedValue(new Error("db down"));
    expireCheckout.mockRejectedValue(new Error("stripe down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { startCheckoutAction } = await import("@/app/checkout/actions");
    await startCheckoutAction(input);
    expect(alertOwner).toHaveBeenCalledWith(expect.stringMatching(/Stripe page/i), expect.stringContaining("cs_1"));
  });
});

describe("checkPartnerCodeAction", () => {
  beforeEach(() => { vi.resetModules(); getCustomer.mockReset(); resolveAttribution.mockReset(); });

  it("requires a verified email before checking a code", async () => {
    getCustomer.mockResolvedValue({ ...customer, emailConfirmed: false });
    const { checkPartnerCodeAction } = await import("@/app/checkout/actions");
    expect(await checkPartnerCodeAction("SMITHLAB")).toEqual({ ok: false, message: "Please verify your email first — check your inbox for the link." });
    expect(resolveAttribution).not.toHaveBeenCalled();
  });

  it("confirms a usable code and explains a refused one", async () => {
    getCustomer.mockResolvedValue(customer);
    resolveAttribution.mockResolvedValueOnce({ attribution: { partnerId: "p1", code: "SMITHLAB", via: "code" } })
      .mockResolvedValueOnce({ attribution: null, codeError: "You can't use your own partner code." });
    const { checkPartnerCodeAction } = await import("@/app/checkout/actions");
    expect(await checkPartnerCodeAction("smithlab")).toEqual({ ok: true, code: "SMITHLAB" });
    expect(await checkPartnerCodeAction("MINE1")).toEqual({ ok: false, message: "You can't use your own partner code." });
  });
});
