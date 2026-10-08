import { describe, it, expect, vi, beforeEach } from "vitest";

const getCustomer = vi.fn(), getWholesaleSettings = vi.fn(), enableWholesale = vi.fn(), saveResearchVerification = vi.fn();
const verifyHumanCheck = vi.fn(), getLiveCatalog = vi.fn(), createPendingWholesaleOrder = vi.fn(), transitionOrder = vi.fn(), attachCheckoutSession = vi.fn();
const getOrderForCustomer = vi.fn(), refundCard = vi.fn(), sendOrAlert = vi.fn(), alertOwner = vi.fn(), closeOpenCheckouts = vi.fn();
const quoteTax = vi.fn(), createPaymentCheckout = vi.fn(), expireCheckout = vi.fn(), revalidatePath = vi.fn();
vi.mock("@/lib/dal", () => ({ getCustomer }));
vi.mock("@/lib/wholesale/data", () => ({ getWholesaleSettings, enableWholesale }));
vi.mock("@/lib/account/research-data", () => ({ saveResearchVerification }));
vi.mock("@/lib/turnstile", () => ({ verifyHumanCheck }));
vi.mock("@/lib/catalog-live", () => ({ getLiveCatalog }));
vi.mock("@/lib/orders", () => ({ createPendingWholesaleOrder, transitionOrder, attachCheckoutSession, getOrderForCustomer, saveShipAddress: vi.fn(), saveStripeCustomerId: vi.fn() }));
vi.mock("@/lib/refunds/stripe", () => ({ refundCard }));
vi.mock("@/lib/notify", () => ({ sendOrAlert, alertOwner }));
vi.mock("@/lib/checkout-close", () => ({ closeOpenCheckouts }));
vi.mock("@/lib/commerce", () => ({ getCommerceAdapter: () => ({ quoteTax, createPaymentCheckout, expireCheckout }) }));
vi.mock("@/lib/checkout-shared", () => ({ bookkeep: async (_w: string, f: () => Promise<void>) => f(), requestIp: async () => "1.2.3.4", requestIpHash: async () => "iphash" }));
vi.mock("@/lib/supabase/env", () => ({ siteUrl: () => "https://auraprotocols.com" }));
vi.mock("@/lib/clock", () => ({ currentMs: () => Date.parse("2026-10-09T18:00:00Z") }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/headers", () => ({ headers: async () => new Map([["user-agent", "UA"]]) }));

const settings = { open: true, tiers: [{ minKits: 1, pct: 25 }, { minKits: 5, pct: 30 }, { minKits: 10, pct: 35 }], depositPct: 40, balanceDays: 7, runDays: 14, leadDays: 28, nextCutoffOverride: null };
const customer = (o: Record<string, unknown> = {}) => ({ id: "c1", email: "j@lab.org", fullName: "Jane", emailConfirmed: true, stripeCustomerId: null,
  research: { field: "independent", org: "Lab", verifiedAt: "x" }, wholesale: { enabledAt: "2026-10-01T00:00:00Z", disabledAt: null }, ...o });
const ship = { name: "Jane", line1: "1 A St", line2: null, city: "Austin", state: "TX", zip: "78701" };
const live = { shown: [{ slug: "bpc-157", name: "BPC-157", chemicalClass: "Peptide", variants: [{ id: "10mg", strength: "10 mg", priceUsd: 68, wholesale: true }] }] };
const input = { lines: [{ slug: "bpc-157", variantId: "10mg", kits: 2 }], ship, ruoConfirmed: true, humanToken: "tok" };

describe("wholesale actions", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const f of [getCustomer, getWholesaleSettings, enableWholesale, saveResearchVerification, verifyHumanCheck, getLiveCatalog, createPendingWholesaleOrder,
      transitionOrder, attachCheckoutSession, getOrderForCustomer, refundCard, sendOrAlert, alertOwner, closeOpenCheckouts, quoteTax, createPaymentCheckout, expireCheckout, revalidatePath]) f.mockReset();
    getWholesaleSettings.mockResolvedValue(settings);
    verifyHumanCheck.mockResolvedValue({ ok: true });
    getLiveCatalog.mockResolvedValue(live);
    closeOpenCheckouts.mockResolvedValue({ failed: [] });
    quoteTax.mockResolvedValue({ calculationId: "taxcalc_1", taxCents: 8000 });
    createPendingWholesaleOrder.mockResolvedValue({ id: "o1", orderNumber: "AP-1050" });
    createPaymentCheckout.mockResolvedValue({ kind: "redirect", url: "https://stripe/cs", sessionId: "cs_1", stripeCustomerId: "cus_1", couponId: null });
    transitionOrder.mockResolvedValue(true);
  });

  it("start: prices kits server-side, quotes tax on the full order, creates the order on the current run, charges the 40% deposit", async () => {
    getCustomer.mockResolvedValue(customer());
    const { startWholesaleCheckoutAction } = await import("@/app/wholesale/actions");
    expect(await startWholesaleCheckoutAction(input)).toEqual({ url: "https://stripe/cs" });
    expect(createPendingWholesaleOrder).toHaveBeenCalledWith(expect.objectContaining({ customerId: "c1", cutoffOn: "2026-10-19", taxCents: 8000, taxCalculationId: "taxcalc_1",
      quote: expect.objectContaining({ subtotalCents: 102000, depositCents: 40800 }) }));
    expect(createPaymentCheckout).toHaveBeenCalledWith(expect.objectContaining({ orderId: "o1", payment: "deposit", amountCents: 40800, cancelPath: "/wholesale" }));
    expect(attachCheckoutSession).toHaveBeenCalledWith("o1", "cs_1");
  });

  it("start refuses when wholesale is closed, not turned on, or switched off — before any work", async () => {
    const { startWholesaleCheckoutAction } = await import("@/app/wholesale/actions");
    getCustomer.mockResolvedValue(customer());
    getWholesaleSettings.mockResolvedValue({ ...settings, open: false });
    expect((await startWholesaleCheckoutAction(input)).error).toMatch(/not open/i);
    getWholesaleSettings.mockResolvedValue(settings);
    getCustomer.mockResolvedValue(customer({ wholesale: { enabledAt: null, disabledAt: null } }));
    expect((await startWholesaleCheckoutAction(input)).error).toMatch(/turn on wholesale/i);
    getCustomer.mockResolvedValue(customer({ wholesale: { enabledAt: "x", disabledAt: "y" } }));
    expect((await startWholesaleCheckoutAction(input)).error).toMatch(/switched off/i);
    expect(verifyHumanCheck).not.toHaveBeenCalled();
    expect(createPendingWholesaleOrder).not.toHaveBeenCalled();
  });

  it("start: a failed human check creates nothing", async () => {
    getCustomer.mockResolvedValue(customer());
    verifyHumanCheck.mockResolvedValue({ ok: false, reason: "failed" });
    const { startWholesaleCheckoutAction } = await import("@/app/wholesale/actions");
    expect((await startWholesaleCheckoutAction(input)).error).toBeTruthy();
    expect(createPendingWholesaleOrder).not.toHaveBeenCalled();
  });

  it("start: Stripe failing cancels the pending order", async () => {
    getCustomer.mockResolvedValue(customer());
    createPaymentCheckout.mockRejectedValue(new Error("stripe down"));
    const { startWholesaleCheckoutAction } = await import("@/app/wholesale/actions");
    expect((await startWholesaleCheckoutAction(input)).error).toMatch(/couldn't start payment/i);
    expect(transitionOrder).toHaveBeenCalledWith("o1", "awaiting_payment", "cancelled");
  });

  it("enable: saves research when missing, records the agreement, refreshes the page", async () => {
    getCustomer.mockResolvedValue(customer({ research: null, wholesale: { enabledAt: null, disabledAt: null } }));
    enableWholesale.mockResolvedValue("enabled");
    const { enableWholesaleAction } = await import("@/app/wholesale/actions");
    expect(await enableWholesaleAction({ agree: true, research: { field: "independent", org: "Halden Labs" } })).toEqual({ ok: true });
    expect(saveResearchVerification).toHaveBeenCalledWith("c1", { field: "independent", org: "Halden Labs" });
    expect(enableWholesale).toHaveBeenCalledWith("c1", { ipHash: "iphash", userAgent: "UA" });
    expect(revalidatePath).toHaveBeenCalledWith("/wholesale");
  });

  it("cancel before the cutoff refunds the deposit to the card, then marks it refunded and emails", async () => {
    getCustomer.mockResolvedValue(customer());
    getOrderForCustomer.mockResolvedValue({ id: "o1", order_number: "AP-1050", email: "j@lab.org", channel: "wholesale", status: "deposit_paid",
      wholesale_cutoff_on: "2026-10-19", deposit_cents: 40800, deposit_payment_intent: "pi_dep", order_items: [] });
    refundCard.mockResolvedValue("re_1");
    const { cancelWholesaleOrderAction } = await import("@/app/wholesale/actions");
    expect(await cancelWholesaleOrderAction("AP-1050")).toEqual({ ok: true });
    expect(refundCard).toHaveBeenCalledWith("pi_dep", 40800, "o1");
    expect(transitionOrder).toHaveBeenCalledWith("o1", "deposit_paid", "refunded", { refund_destination: "card", refund_reason: "customer_cancelled", stripe_refund_id: "re_1" });
    expect(sendOrAlert).toHaveBeenCalled();
  });

  it("cancel after the cutoff is refused and nothing is refunded", async () => {
    getCustomer.mockResolvedValue(customer());
    getOrderForCustomer.mockResolvedValue({ id: "o1", order_number: "AP-1050", channel: "wholesale", status: "deposit_paid", wholesale_cutoff_on: "2026-10-05", deposit_cents: 40800, deposit_payment_intent: "pi_dep" });
    const { cancelWholesaleOrderAction } = await import("@/app/wholesale/actions");
    expect((await cancelWholesaleOrderAction("AP-1050")).error).toMatch(/order-by date/i);
    expect(refundCard).not.toHaveBeenCalled();
  });
});
