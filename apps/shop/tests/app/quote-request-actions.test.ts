import { describe, it, expect, vi, beforeEach } from "vitest";

// quote-requests.sql: the buyer closes an unpriced request (Cancel / Order now);
// the owner prices it (same order) or cancels it.
const m = vi.hoisted(() => ({
  getCustomer: vi.fn(), getOrderForCustomer: vi.fn(), getOrderById: vi.fn(), closeQuoteRequest: vi.fn(), priceQuoteRequest: vi.fn(),
  sendOrAlert: vi.fn(), requirePermission: vi.fn(), recordAdminEvent: vi.fn(), getCustomerDetail: vi.fn(),
  getWholesaleSettings: vi.fn(), getBankDetails: vi.fn(), getLiveCatalog: vi.fn(), redirect: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (u: string) => { m.redirect(u); throw new Error(`REDIRECT ${u}`); } }));
vi.mock("@/lib/dal", () => ({ getCustomer: m.getCustomer, requirePermission: m.requirePermission }));
vi.mock("@/lib/orders", () => ({ getOrderForCustomer: m.getOrderForCustomer, getOrderById: m.getOrderById, attachCheckoutSession: vi.fn(), saveShipAddress: vi.fn(), saveStripeCustomerId: vi.fn(), transitionOrder: vi.fn() }));
vi.mock("@/lib/wholesale/quote-data", () => ({
  closeQuoteRequest: m.closeQuoteRequest, priceQuoteRequest: m.priceQuoteRequest, createQuoteOrder: vi.fn(),
  getBankDetails: m.getBankDetails, markTransferSent: vi.fn(), saveQuoteShip: vi.fn(), recordBankTransfer: vi.fn(),
}));
vi.mock("@/lib/notify", () => ({ sendOrAlert: m.sendOrAlert, alertOwner: vi.fn(), alertAddress: () => "admin@auraprotocols.com" }));
vi.mock("@/lib/commerce", () => ({ getCommerceAdapter: vi.fn() }));
vi.mock("@/lib/checkout-shared", () => ({ bookkeep: vi.fn() }));
vi.mock("@/lib/supabase/env", () => ({ siteUrl: () => "https://auraprotocols.com" }));
vi.mock("@/lib/audit/data", () => ({ recordAdminEvent: m.recordAdminEvent }));
vi.mock("@/lib/customers/data", () => ({ getCustomerDetail: m.getCustomerDetail }));
vi.mock("@/lib/wholesale/data", () => ({ getWholesaleSettings: m.getWholesaleSettings }));
vi.mock("@/lib/catalog-live", () => ({ getLiveCatalog: m.getLiveCatalog }));
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: vi.fn() }));
vi.mock("@/lib/clock", () => ({ currentMs: () => Date.parse("2026-10-17T18:00:00Z") }));

const items = [{ id: "it1", compound_slug: "bpc-157", variant_id: "10mg", quantity: 22 }, { id: "it2", compound_slug: "tb-500", variant_id: "10mg", quantity: 8 }];
const request = { id: "11111111-1111-4111-8111-111111111111", order_number: "AP-1063", channel: "wholesale", status: "quote_requested", customer_id: "c1", email: "d@lab.org", order_items: items };

describe("buyer: close a request", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const f of Object.values(m)) f.mockReset();
    m.getCustomer.mockResolvedValue({ id: "c1", email: "d@lab.org", fullName: "Dana Reyes" });
    m.getOrderForCustomer.mockResolvedValue(request);
    m.closeQuoteRequest.mockResolvedValue(true);
    m.sendOrAlert.mockResolvedValue(true);
  });

  it("Order now closes it and opens the order sheet with the same kits; the owner is told not to price it", async () => {
    const { orderNowAtSheetPriceAction } = await import("@/app/order/quote-actions");
    expect(await orderNowAtSheetPriceAction("AP-1063")).toEqual({ ok: true, url: `/wholesale?step=order&kits=${encodeURIComponent("bpc-157/10mg:22,tb-500/10mg:8")}` });
    expect(m.closeQuoteRequest).toHaveBeenCalledWith(request.id, "ordered_now");
    const mail = m.sendOrAlert.mock.calls[0][0];
    expect(mail.to).toBe("admin@auraprotocols.com");
    expect(mail.subject).toBe("Quote request AP-1063 closed by the buyer — no need to price it");
  });

  it("Cancel closes it as cancelled by the buyer", async () => {
    const { cancelQuoteRequestAction } = await import("@/app/order/quote-actions");
    expect(await cancelQuoteRequestAction("AP-1063")).toEqual({ ok: true });
    expect(m.closeQuoteRequest).toHaveBeenCalledWith(request.id, "customer_cancelled");
  });

  it("already priced, closed, someone else's, or signed out: nothing changes and the buyer is told", async () => {
    const { cancelQuoteRequestAction } = await import("@/app/order/quote-actions");
    m.getOrderForCustomer.mockResolvedValue({ ...request, status: "quoted" });
    expect((await cancelQuoteRequestAction("AP-1063")).error).toContain("We've just priced this order");
    m.getOrderForCustomer.mockResolvedValue({ ...request, status: "cancelled" });
    expect((await cancelQuoteRequestAction("AP-1063")).error).toContain("already closed");
    m.getOrderForCustomer.mockResolvedValue(null);
    expect((await cancelQuoteRequestAction("AP-1063")).error).toBe("Order not found.");
    m.getCustomer.mockResolvedValue(null);
    expect((await cancelQuoteRequestAction("AP-1063")).error).toBe("Please sign in.");
    m.getCustomer.mockResolvedValue({ id: "c1", email: "d@lab.org", fullName: "Dana Reyes" });
    m.getOrderForCustomer.mockResolvedValue(request);
    m.closeQuoteRequest.mockResolvedValue(false);
    expect((await cancelQuoteRequestAction("AP-1063")).error).toContain("changed");
    expect(m.sendOrAlert).not.toHaveBeenCalled();
  });
});

describe("owner: price or cancel a request", () => {
  const rows = [{ slug: "bpc-157", name: "BPC-157", designation: null, chemicalClass: "Peptide Fragments", variants: [{ id: "10mg", strength: "10 mg", priceUsd: 65, wholesale: true }] },
    { slug: "tb-500", name: "TB-500", designation: null, chemicalClass: "Peptide Fragments", variants: [{ id: "10mg", strength: "10 mg", priceUsd: 90, wholesale: true }] }];
  const form = (extra: Record<string, string> = {}) => {
    const f = new FormData();
    const v: Record<string, string> = {
      customerId: "22222222-2222-4222-8222-222222222222", requestOrderId: request.id, lineCount: "2",
      slug0: "bpc-157", variant0: "10mg", kits0: "22", pct0: "45", slug1: "tb-500", variant1: "10mg", kits1: "8", pct1: "45",
      cutoffOn: "2026-10-19", depositPct: "40", validUntil: "2026-10-31", payBank: "on", payCard: "on", note: "", ...extra,
    };
    for (const [k, x] of Object.entries(v)) f.set(k, x);
    return f;
  };
  beforeEach(() => {
    vi.resetModules();
    for (const f of Object.values(m)) f.mockReset();
    m.requirePermission.mockResolvedValue({ id: "owner" });
    m.getWholesaleSettings.mockResolvedValue({ open: true, tiers: [{ minKits: 5, pct: 30 }, { minKits: 20, pct: 40 }], depositPct: 40, minKits: 5, runDays: 14, leadDays: 22, nextCutoffOverride: null, kitBoxCents: 150, balanceDays: 7 });
    m.getBankDetails.mockResolvedValue({ accountName: "x", bankName: "x", routing: "000000000", account: "0000001234", note: null });
    m.getLiveCatalog.mockResolvedValue({ shown: rows });
    m.getCustomerDetail.mockResolvedValue({ id: "c1", fullName: "Dana Reyes", email: "d@lab.org", blockedAt: null, wholesale: { enabledAt: "2026-10-01", disabledAt: null } });
    m.sendOrAlert.mockResolvedValue(true);
  });

  it("prices the same order, emails the buyer their pay link, logs who priced it", async () => {
    m.getOrderById.mockResolvedValueOnce(request).mockResolvedValueOnce({ ...request, status: "quoted", total_cents: 1, deposit_cents: 1, order_items: [] });
    m.priceQuoteRequest.mockResolvedValue("priced");
    const { createQuoteOrderAction } = await import("@/app/admin/orders/quote/actions");
    await expect(createQuoteOrderAction(null, form())).rejects.toThrow("REDIRECT /admin/orders/AP-1063");
    expect(m.priceQuoteRequest).toHaveBeenCalledWith(request, expect.objectContaining({ cutoffOn: "2026-10-19", depositPct: 40, validUntil: "2026-10-31", actorId: "owner" }));
    expect(m.sendOrAlert.mock.calls[0][0]).toMatchObject({ to: "d@lab.org", subject: "Order AP-1063 — your volume price is ready" });
    expect(m.recordAdminEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "quote_priced", label: "AP-1063", actorId: "owner" }));
  });

  it("a request the buyer closed while it was being priced: nothing sent, the owner is told", async () => {
    m.getOrderById.mockResolvedValue({ ...request, status: "cancelled" });
    const { createQuoteOrderAction } = await import("@/app/admin/orders/quote/actions");
    expect((await createQuoteOrderAction(null, form()))?.error).toBe("AP-1063 was closed by the buyer before it was priced — nothing was sent.");
    m.getOrderById.mockResolvedValue(request);
    m.priceQuoteRequest.mockResolvedValue("stale");
    expect((await createQuoteOrderAction(null, form()))?.error).toContain("closed by the buyer");
    expect(m.sendOrAlert).not.toHaveBeenCalled();
  });

  it("someone else's request is refused; a double submit opens the priced order", async () => {
    m.getOrderById.mockResolvedValue({ ...request, customer_id: "other" });
    const { createQuoteOrderAction } = await import("@/app/admin/orders/quote/actions");
    expect((await createQuoteOrderAction(null, form()))?.error).toContain("couldn't be found");
    m.getOrderById.mockResolvedValue({ ...request, status: "quoted" });
    await expect(createQuoteOrderAction(null, form())).rejects.toThrow("REDIRECT /admin/orders/AP-1063");
    expect(m.priceQuoteRequest).not.toHaveBeenCalled();
  });

  it("Cancel request closes it and emails the buyer", async () => {
    m.getOrderById.mockResolvedValue(request);
    m.closeQuoteRequest.mockResolvedValue(true);
    const { cancelQuoteRequestOwnerAction } = await import("@/app/admin/orders/quote/actions");
    const f = new FormData(); f.set("orderId", request.id);
    await cancelQuoteRequestOwnerAction(f);
    expect(m.closeQuoteRequest).toHaveBeenCalledWith(request.id, "owner_cancelled");
    expect(m.sendOrAlert.mock.calls[0][0]).toMatchObject({ to: "d@lab.org", subject: "Order AP-1063 — quote request closed" });
    expect(m.recordAdminEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "quote_request_cancelled", detail: "never priced · email: sent" }));
  });
});
