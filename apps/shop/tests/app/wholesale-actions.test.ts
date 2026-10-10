import { describe, it, expect, vi, beforeEach } from "vitest";

const getCustomer = vi.fn(), getWholesaleSettings = vi.fn(), enableWholesale = vi.fn(), saveResearchVerification = vi.fn();
const verifyHumanCheck = vi.fn(), getLiveCatalog = vi.fn(), createPendingWholesaleOrder = vi.fn(), transitionOrder = vi.fn(), attachCheckoutSession = vi.fn();
const getOrderForCustomer = vi.fn(), refundCard = vi.fn(), sendOrAlert = vi.fn(), alertOwner = vi.fn(), closeOpenCheckouts = vi.fn(), stampWholesaleCancel = vi.fn();
const quoteTax = vi.fn(), createPaymentCheckout = vi.fn(), expireCheckout = vi.fn(), revalidatePath = vi.fn(), saveBalanceSession = vi.fn();
vi.mock("@/lib/dal", () => ({ getCustomer }));
vi.mock("@/lib/wholesale/data", () => ({ getWholesaleSettings, enableWholesale }));
vi.mock("@/lib/account/research-data", () => ({ saveResearchVerification }));
vi.mock("@/lib/turnstile", () => ({ verifyHumanCheck }));
vi.mock("@/lib/catalog-live", () => ({ getLiveCatalog }));
vi.mock("@/lib/orders", () => ({ createPendingWholesaleOrder, transitionOrder, attachCheckoutSession, getOrderForCustomer, stampWholesaleCancel, saveBalanceSession, saveShipAddress: vi.fn(), saveStripeCustomerId: vi.fn() }));
vi.mock("@/lib/refunds/stripe", () => ({ refundCard }));
const runByCutoff = vi.fn(), runLines = vi.fn();
vi.mock("@/lib/wholesale/runs-data", () => ({ runByCutoff, runLines }));
vi.mock("@/lib/notify", () => ({ sendOrAlert, alertOwner }));
vi.mock("@/lib/checkout-close", () => ({ closeOpenCheckouts }));
vi.mock("@/lib/commerce", () => ({ getCommerceAdapter: () => ({ quoteTax, createPaymentCheckout, expireCheckout }) }));
vi.mock("@/lib/checkout-shared", () => ({ bookkeep: async (_w: string, f: () => Promise<void>) => f(), requestIp: async () => "1.2.3.4", requestIpHash: async () => "iphash" }));
vi.mock("@/lib/supabase/env", () => ({ siteUrl: () => "https://auraprotocols.com" }));
vi.mock("@/lib/clock", () => ({ currentMs: () => Date.parse("2026-10-09T18:00:00Z") }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/headers", () => ({ headers: async () => new Map([["user-agent", "UA"]]) }));

const settings = { open: true, tiers: [{ minKits: 5, pct: 25 }, { minKits: 10, pct: 30 }, { minKits: 20, pct: 35 }], depositPct: 40, balanceDays: 7, runDays: 14, leadDays: 28, nextCutoffOverride: null,
  minKits: 5 };
const customer = (o: Record<string, unknown> = {}) => ({ id: "c1", email: "j@lab.org", fullName: "Jane", emailConfirmed: true, stripeCustomerId: null,
  research: { field: "independent", org: "Lab", verifiedAt: "x" }, wholesale: { enabledAt: "2026-10-01T00:00:00Z", disabledAt: null }, ...o });
const ship = { name: "Jane", line1: "1 A St", line2: null, city: "Austin", state: "TX", zip: "78701" };
const live = { shown: [
  { slug: "bpc-157", name: "BPC-157", chemicalClass: "Peptide", variants: [{ id: "10mg", strength: "10 mg", priceUsd: 68, wholesale: true }] },
  { slug: "tb-500", name: "TB-500", chemicalClass: "Peptide", variants: [{ id: "10mg", strength: "10 mg", priceUsd: 66, wholesale: true }] },
] };
const input = { lines: [{ slug: "bpc-157", variantId: "10mg", kits: 3 }, { slug: "tb-500", variantId: "10mg", kits: 2 }], ship, ruoConfirmed: true, humanToken: "tok" };
const wholesaleOrder = { id: "o1", order_number: "AP-1050", email: "j@lab.org", channel: "wholesale", status: "deposit_paid",
  wholesale_cutoff_on: "2026-10-19", deposit_cents: 40800, deposit_payment_intent: "pi_dep", order_items: [] };

describe("wholesale actions", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const f of [getCustomer, getWholesaleSettings, enableWholesale, saveResearchVerification, verifyHumanCheck, getLiveCatalog, createPendingWholesaleOrder,
      transitionOrder, attachCheckoutSession, getOrderForCustomer, refundCard, sendOrAlert, alertOwner, closeOpenCheckouts, stampWholesaleCancel,
      quoteTax, createPaymentCheckout, expireCheckout, revalidatePath, saveBalanceSession]) f.mockReset();
    getWholesaleSettings.mockResolvedValue(settings);
    runByCutoff.mockReset(); runLines.mockReset(); runByCutoff.mockResolvedValue({ id: "r1" }); runLines.mockResolvedValue([]);
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
    // 3 x $544 + 2 x $528 at 20% off = $2,688; deposit 40%
    expect(createPendingWholesaleOrder).toHaveBeenCalledWith(expect.objectContaining({ customerId: "c1", cutoffOn: "2026-10-19", taxCents: 8000, taxCalculationId: "taxcalc_1",
      quote: expect.objectContaining({ subtotalCents: 252000, depositCents: 100800 }) }));
    expect(createPaymentCheckout).toHaveBeenCalledWith(expect.objectContaining({ orderId: "o1", payment: "deposit", amountCents: 100800, cancelPath: "/wholesale?step=order" }));
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

  it("start: an order under the minimum is refused before any work", async () => {
    getCustomer.mockResolvedValue(customer());
    const { startWholesaleCheckoutAction } = await import("@/app/wholesale/actions");
    const r = await startWholesaleCheckoutAction({ ...input, lines: [{ slug: "bpc-157", variantId: "10mg", kits: 4 }] });
    expect(r.error).toMatch(/at least 5 kits/i);
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

  it("start: an unavailable human check alerts the owner and creates nothing", async () => {
    getCustomer.mockResolvedValue(customer());
    verifyHumanCheck.mockResolvedValue({ ok: false, reason: "unavailable", detail: "no secret" });
    const { startWholesaleCheckoutAction } = await import("@/app/wholesale/actions");
    expect((await startWholesaleCheckoutAction(input)).error).toBeTruthy();
    expect(alertOwner).toHaveBeenCalledWith("Checkout: human check unavailable", expect.stringContaining("no secret"));
    expect(createPendingWholesaleOrder).not.toHaveBeenCalled();
  });

  it("start: a line for a strength not sold wholesale is rejected and nothing is created", async () => {
    getCustomer.mockResolvedValue(customer());
    getLiveCatalog.mockResolvedValue({ shown: [{ slug: "bpc-157", name: "BPC-157", chemicalClass: "Peptide", variants: [{ id: "10mg", strength: "10 mg", priceUsd: 68, wholesale: false }] }, live.shown[1]] });
    const { startWholesaleCheckoutAction } = await import("@/app/wholesale/actions");
    const r = await startWholesaleCheckoutAction(input);
    expect(r.rejected).toEqual([{ slug: "bpc-157", variantId: "10mg", reason: "unknown" }]);
    expect(createPendingWholesaleOrder).not.toHaveBeenCalled();
  });

  it("start: Stripe failing cancels the pending order", async () => {
    getCustomer.mockResolvedValue(customer());
    createPaymentCheckout.mockRejectedValue(new Error("stripe down"));
    const { startWholesaleCheckoutAction } = await import("@/app/wholesale/actions");
    expect((await startWholesaleCheckoutAction(input)).error).toMatch(/couldn't start payment/i);
    expect(transitionOrder).toHaveBeenCalledWith("o1", "awaiting_payment", "cancelled");
  });

  it("start: Stripe unavailable cancels the pending order and returns Stripe's message", async () => {
    getCustomer.mockResolvedValue(customer());
    createPaymentCheckout.mockResolvedValue({ kind: "unavailable", message: "Checkout opens soon — we'll email you the moment it's live." });
    const { startWholesaleCheckoutAction } = await import("@/app/wholesale/actions");
    expect(await startWholesaleCheckoutAction(input)).toEqual({ error: "Checkout opens soon — we'll email you the moment it's live." });
    expect(transitionOrder).toHaveBeenCalledWith("o1", "awaiting_payment", "cancelled");
  });

  it("start: a failed save of the checkout session closes the Stripe page and cancels the order", async () => {
    getCustomer.mockResolvedValue(customer());
    attachCheckoutSession.mockRejectedValueOnce(new Error("db down"));
    const { startWholesaleCheckoutAction } = await import("@/app/wholesale/actions");
    expect((await startWholesaleCheckoutAction(input)).error).toMatch(/couldn't start payment/i);
    expect(expireCheckout).toHaveBeenCalledWith("cs_1");
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

  it("enable: refuses a customer whose wholesale was switched off", async () => {
    getCustomer.mockResolvedValue(customer({ wholesale: { enabledAt: "2026-10-01T00:00:00Z", disabledAt: "2026-10-05T00:00:00Z" } }));
    const { enableWholesaleAction } = await import("@/app/wholesale/actions");
    expect((await enableWholesaleAction({ agree: true })).error).toMatch(/switched off/i);
    expect(enableWholesale).not.toHaveBeenCalled();
  });

  it("enable: asks for research details when missing and none were given", async () => {
    getCustomer.mockResolvedValue(customer({ research: null, wholesale: { enabledAt: null, disabledAt: null } }));
    const { enableWholesaleAction } = await import("@/app/wholesale/actions");
    const { RESEARCH_REQUIRED } = await import("@/lib/account/research");
    expect(await enableWholesaleAction({ agree: true })).toEqual({ error: RESEARCH_REQUIRED });
    expect(enableWholesale).not.toHaveBeenCalled();
  });

  it("enable: a race with the owner switching it off is reported, without revalidating", async () => {
    getCustomer.mockResolvedValue(customer({ wholesale: { enabledAt: null, disabledAt: null } }));
    enableWholesale.mockResolvedValue("disabled");
    const { enableWholesaleAction } = await import("@/app/wholesale/actions");
    expect((await enableWholesaleAction({ agree: true })).error).toMatch(/switched off/i);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("cancel before the cutoff refunds the deposit to the card, then marks it refunded and emails", async () => {
    getCustomer.mockResolvedValue(customer());
    getOrderForCustomer.mockResolvedValue({ ...wholesaleOrder });
    refundCard.mockResolvedValue("re_1");
    const { cancelWholesaleOrderAction } = await import("@/app/wholesale/actions");
    expect(await cancelWholesaleOrderAction("AP-1050")).toEqual({ ok: true });
    expect(refundCard).toHaveBeenCalledWith("pi_dep", 40800, "order-refund-o1-deposit");
    expect(transitionOrder).toHaveBeenCalledWith("o1", "deposit_paid", "refunded", { refund_destination: "card", refund_reason: "customer_cancelled", stripe_refund_id: "re_1" });
    expect(sendOrAlert).toHaveBeenCalledTimes(1);
    expect(stampWholesaleCancel).not.toHaveBeenCalled();
    expect(alertOwner).not.toHaveBeenCalled();
  });

  it("cancel after the cutoff is refused and nothing is refunded", async () => {
    getCustomer.mockResolvedValue(customer());
    getOrderForCustomer.mockResolvedValue({ id: "o1", order_number: "AP-1050", channel: "wholesale", status: "deposit_paid", wholesale_cutoff_on: "2026-10-05", deposit_cents: 40800, deposit_payment_intent: "pi_dep" });
    const { cancelWholesaleOrderAction } = await import("@/app/wholesale/actions");
    expect((await cancelWholesaleOrderAction("AP-1050")).error).toMatch(/order-by date/i);
    expect(refundCard).not.toHaveBeenCalled();
  });

  it("cancel when the order is already refunded does nothing", async () => {
    getCustomer.mockResolvedValue(customer());
    getOrderForCustomer.mockResolvedValue({ ...wholesaleOrder, status: "refunded" });
    const { cancelWholesaleOrderAction } = await import("@/app/wholesale/actions");
    expect(await cancelWholesaleOrderAction("AP-1050")).toEqual({ ok: true });
    expect(refundCard).not.toHaveBeenCalled();
    expect(transitionOrder).not.toHaveBeenCalled();
    expect(sendOrAlert).not.toHaveBeenCalled();
    expect(alertOwner).not.toHaveBeenCalled();
  });

  it("cancel refuses an order that doesn't exist or isn't wholesale", async () => {
    getCustomer.mockResolvedValue(customer());
    getOrderForCustomer.mockResolvedValueOnce(null);
    const { cancelWholesaleOrderAction } = await import("@/app/wholesale/actions");
    expect((await cancelWholesaleOrderAction("AP-9999")).error).toBe("Order not found.");
    getOrderForCustomer.mockResolvedValueOnce({ id: "o2", order_number: "AP-1001", channel: "retail", status: "paid" });
    expect((await cancelWholesaleOrderAction("AP-1001")).error).toBe("Order not found.");
  });

  it("cancel where the webhook wins the race but hasn't recorded refund details yet stamps them and emails once", async () => {
    getCustomer.mockResolvedValue(customer());
    getOrderForCustomer.mockResolvedValueOnce({ ...wholesaleOrder }).mockResolvedValueOnce({ ...wholesaleOrder, status: "refunded", stripe_refund_id: null });
    refundCard.mockResolvedValue("re_1");
    transitionOrder.mockResolvedValue(false);
    const { cancelWholesaleOrderAction } = await import("@/app/wholesale/actions");
    expect(await cancelWholesaleOrderAction("AP-1050")).toEqual({ ok: true });
    expect(stampWholesaleCancel).toHaveBeenCalledWith("o1", "re_1");
    expect(sendOrAlert).toHaveBeenCalledTimes(1);
    expect(alertOwner).not.toHaveBeenCalled();
  });

  it("cancel where the transition fails and the order is still not refunded alerts the owner, without emailing", async () => {
    getCustomer.mockResolvedValue(customer());
    getOrderForCustomer.mockResolvedValueOnce({ ...wholesaleOrder }).mockResolvedValueOnce({ ...wholesaleOrder, status: "deposit_paid" });
    refundCard.mockResolvedValue("re_1");
    transitionOrder.mockResolvedValue(false);
    const { cancelWholesaleOrderAction } = await import("@/app/wholesale/actions");
    expect(await cancelWholesaleOrderAction("AP-1050")).toEqual({ ok: true });
    expect(alertOwner).toHaveBeenCalledWith("Wholesale deposit refunded but order not updated", expect.stringContaining("AP-1050"));
    expect(sendOrAlert).not.toHaveBeenCalled();
    expect(stampWholesaleCancel).not.toHaveBeenCalled();
  });

  it("cancel where the refund itself fails returns an error and touches nothing else", async () => {
    getCustomer.mockResolvedValue(customer());
    getOrderForCustomer.mockResolvedValue({ ...wholesaleOrder });
    refundCard.mockRejectedValue(new Error("stripe down"));
    const { cancelWholesaleOrderAction } = await import("@/app/wholesale/actions");
    expect((await cancelWholesaleOrderAction("AP-1050")).error).toBeTruthy();
    expect(transitionOrder).not.toHaveBeenCalled();
    expect(sendOrAlert).not.toHaveBeenCalled();
  });

  describe("pay the balance", () => {
    const due = { ...wholesaleOrder, status: "balance_due", balance_cents: 190150, balance_session_id: "cs_old",
      ship_name: "Jane", ship_line1: "1 A St", ship_line2: null, ship_city: "Austin", ship_state: "TX", ship_zip: "78701" };

    it("expires the earlier page, opens a fresh balance page, saves its session", async () => {
      getCustomer.mockResolvedValue(customer());
      getOrderForCustomer.mockResolvedValue(due);
      const { payBalanceAction } = await import("@/app/wholesale/actions");
      expect(await payBalanceAction("AP-1050")).toEqual({ url: "https://stripe/cs" });
      expect(expireCheckout).toHaveBeenCalledWith("cs_old");
      expect(createPaymentCheckout).toHaveBeenCalledWith(expect.objectContaining({ orderId: "o1", payment: "balance", amountCents: 190150, cancelPath: "/order/AP-1050", attempt: expect.any(Number) }));
      expect(saveBalanceSession).toHaveBeenCalledWith("o1", "cs_1");
    });

    it("refuses when nothing is due, or the order isn't theirs", async () => {
      getCustomer.mockResolvedValue(customer());
      const { payBalanceAction } = await import("@/app/wholesale/actions");
      getOrderForCustomer.mockResolvedValue({ ...due, status: "deposit_paid" });
      expect((await payBalanceAction("AP-1050")).error).toMatch(/no balance due/);
      getOrderForCustomer.mockResolvedValue(null);
      expect((await payBalanceAction("AP-1050")).error).toMatch(/not found/i);
      expect(createPaymentCheckout).not.toHaveBeenCalled();
    });

    it("Stripe unavailable: its message, nothing saved", async () => {
      getCustomer.mockResolvedValue(customer());
      getOrderForCustomer.mockResolvedValue(due);
      createPaymentCheckout.mockResolvedValue({ kind: "unavailable", message: "Payments are paused." });
      const { payBalanceAction } = await import("@/app/wholesale/actions");
      expect(await payBalanceAction("AP-1050")).toEqual({ error: "Payments are paused." });
      expect(saveBalanceSession).not.toHaveBeenCalled();
    });
  });

  it("cancel after the cutoff is allowed when a strength of the order failed testing", async () => {
    getCustomer.mockResolvedValue(customer());
    getOrderForCustomer.mockResolvedValue({ ...wholesaleOrder, wholesale_cutoff_on: "2026-10-05",
      order_items: [{ compound_slug: "retatrutide", compound_name: "Retatrutide", variant_id: "10mg", strength: "10 mg", pack_qty: 10, quantity: 3, line_total_cents: 300000 }] });
    runLines.mockResolvedValue([{ slug: "retatrutide", variant_id: "10mg", result: "failed" }]);
    refundCard.mockResolvedValue("re_1");
    transitionOrder.mockResolvedValue(true);
    sendOrAlert.mockResolvedValue(true);
    const { cancelWholesaleOrderAction } = await import("@/app/wholesale/actions");
    expect(await cancelWholesaleOrderAction("AP-1050")).toEqual({ ok: true });
    expect(refundCard).toHaveBeenCalled();
  });
});
