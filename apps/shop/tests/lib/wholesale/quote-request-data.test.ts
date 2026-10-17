import { describe, it, expect, vi, beforeEach } from "vitest";
import { query, fromQueue, callArgs } from "../../helpers/supabase-mock";

// quote-requests.sql: a request is an order with the kits and no prices; pricing
// replaces its lines and moves it to quoted; closing moves it to cancelled.
let from = fromQueue({});
const transitionOrder = vi.fn();
const alertOwner = vi.fn();
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: (t: string) => from(t) }) }));
vi.mock("@/lib/orders", () => ({ transitionOrder, getOrderById: vi.fn() }));
vi.mock("@/lib/notify", () => ({ alertOwner }));
vi.mock("@/lib/order-paid", () => ({ afterOrderPaid: vi.fn() }));
vi.mock("@/lib/wholesale/after-deposit", () => ({ afterDepositPaid: vi.fn(), depositRunPatch: vi.fn() }));

const rows = [{ slug: "bpc-157", name: "BPC-157", designation: null, chemicalClass: "Peptide Fragments", variantId: "10mg", strength: "10 mg", priceUsd: 65 }];
const pricing = { tiers: [{ minKits: 5, pct: 30 }, { minKits: 20, pct: 40 }], depositPct: 40, minKits: 5 };

describe("quote request data", () => {
  beforeEach(() => { vi.resetModules(); transitionOrder.mockReset(); alertOwner.mockReset(); });

  it("createQuoteRequest: an unpriced wholesale order with the kits (list price kept), linked to its inquiry", async () => {
    const order = query({ data: { id: "o1", order_number: "AP-1063" } });
    const items = query({});
    const inq = query({});
    from = fromQueue({ orders: [order], order_items: [items], inquiries: [inq] });
    const { createQuoteRequest } = await import("@/lib/wholesale/quote-data");
    const r = await createQuoteRequest({ customerId: "c1", email: "d@lab.org", lines: [{ slug: "bpc-157", variantId: "10mg", kits: 30, pct: 0 }], rows, pricing, cutoffOn: "2026-10-19", inquiryId: "i1", kitBoxCents: 150 });
    expect(r).toEqual({ id: "o1", orderNumber: "AP-1063" });
    expect(callArgs(order, "insert")?.[0]).toMatchObject({ status: "quote_requested", channel: "wholesale", kind: "sale", subtotal_cents: 0, total_cents: 0, deposit_cents: null, balance_cents: null, packaging_cents: 4500, wholesale_cutoff_on: "2026-10-19", quote_inquiry_id: "i1" });
    expect(callArgs(items, "insert")?.[0]).toEqual([expect.objectContaining({ order_id: "o1", compound_slug: "bpc-157", quantity: 30, pack_qty: 10, unit_price_cents: 0, line_total_cents: 0, retail_unit_cents: 65000 })]);
    expect(callArgs(inq, "update")?.[0]).toEqual({ order_number: "AP-1063" });
  });

  it("createQuoteRequest: a failed lines insert removes the order and throws", async () => {
    const order = query({ data: { id: "o1", order_number: "AP-1063" } });
    const del = query({});
    from = fromQueue({ orders: [order, del], order_items: [query({ error: { message: "x" } })] });
    const { createQuoteRequest } = await import("@/lib/wholesale/quote-data");
    await expect(createQuoteRequest({ customerId: "c1", email: "d@lab.org", lines: [{ slug: "bpc-157", variantId: "10mg", kits: 30, pct: 0 }], rows, pricing, cutoffOn: "2026-10-19", inquiryId: null, kitBoxCents: 150 })).rejects.toThrow(/order_items/);
    expect(del.calls.map(([m]) => m)).toContain("delete");
  });

  const req = { id: "o1", order_number: "AP-1063", status: "quote_requested", order_items: [{ id: "it1", order_id: "o1", compound_slug: "bpc-157", quantity: 30 }] } as never;
  const price = { kits: 30, subtotalCents: 1072500, shippingCents: 0, insuranceCents: 550, totalBeforeTaxCents: 1073050, depositCents: 429000,
    items: [{ compoundSlug: "bpc-157", compoundName: "BPC-157", chemicalClass: "Peptide Fragments", variantId: "10mg", strength: "10 mg", packQty: 10, quantity: 30, listUnitCents: 65000, packPct: 45, unitPriceCents: 35750, lineTotalCents: 1072500, lotNumber: "" }] } as never;
  const input = { price, cutoffOn: "2026-10-19", depositPct: 40, validUntil: "2026-10-31", payBank: true, payCard: true, note: null, kitBoxCents: 150, actorId: "owner" };

  it("priceQuoteRequest: replaces the lines with the quoted prices, then quote_requested → quoted with the money", async () => {
    const del = query({});
    const ins = query({});
    from = fromQueue({ order_items: [del, ins] });
    transitionOrder.mockResolvedValue(true);
    const { priceQuoteRequest } = await import("@/lib/wholesale/quote-data");
    expect(await priceQuoteRequest(req, input)).toBe("priced");
    expect(callArgs(ins, "insert")?.[0]).toEqual([expect.objectContaining({ unit_price_cents: 35750, line_total_cents: 1072500 })]);
    const [, fromS, toS, patch] = transitionOrder.mock.calls[0];
    expect([fromS, toS]).toEqual(["quote_requested", "quoted"]);
    expect(patch).toMatchObject({ subtotal_cents: 1072500, total_cents: 1073050, deposit_cents: 429000, balance_cents: 644050, quote_valid_until: "2026-10-31", quote_created_by: "owner", quote_pay_bank: true });
    expect(typeof (patch as { quote_priced_at: string }).quote_priced_at).toBe("string");
  });

  it("priceQuoteRequest: stale when the buyer closed it first (owner alerted); a request no longer open isn't touched", async () => {
    from = fromQueue({ order_items: [query({}), query({})] });
    transitionOrder.mockResolvedValue(false);
    const { priceQuoteRequest } = await import("@/lib/wholesale/quote-data");
    expect(await priceQuoteRequest(req, input)).toBe("stale");
    expect(alertOwner).toHaveBeenCalledWith("Quote priced after the request closed", expect.stringContaining("AP-1063"));
    from = fromQueue({});
    expect(await priceQuoteRequest({ ...(req as object), status: "cancelled" } as never, input)).toBe("stale");
  });

  it("closeQuoteRequest records why", async () => {
    transitionOrder.mockResolvedValue(true);
    const { closeQuoteRequest } = await import("@/lib/wholesale/quote-data");
    expect(await closeQuoteRequest("o1", "ordered_now")).toBe(true);
    expect(transitionOrder).toHaveBeenCalledWith("o1", "quote_requested", "cancelled", { quote_closed_reason: "ordered_now" });
  });
});
