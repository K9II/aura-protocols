import { describe, it, expect, vi, beforeEach } from "vitest";
import { query, fromQueue, callArgs } from "../helpers/supabase-mock";

let from: ReturnType<typeof fromQueue>;
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: (t: string) => from(t) }) }));

const ship = { name: "Jane", line1: "1 A St", line2: null, city: "Austin", state: "TX" as const, zip: "78701" };
const priced = {
  items: [{ compoundSlug: "bpc-157", compoundName: "BPC-157", variantId: "5mg", strength: "5 mg", packQty: 1, quantity: 2,
    listUnitCents: 4900, packPct: 0, unitPriceCents: 4900, lineTotalCents: 9800, lotNumber: "AP-0001" }],
  rejected: [], subtotalCents: 9800, partnerDiscountCents: 0, shippingCents: 1500, insuranceCents: 550, totalBeforeTaxCents: 11850,
};

describe("orders", () => {
  beforeEach(() => vi.resetModules());

  it("createPendingOrder inserts the order snapshot then its items", async () => {
    const orderQ = query({ data: { id: "o1", order_number: "AP-1001" } });
    const itemsQ = query({});
    from = fromQueue({ orders: [orderQ], order_items: [itemsQ] });
    const { createPendingOrder } = await import("@/lib/orders");
    const r = await createPendingOrder({ customerId: "u1", email: "j@lab.org", ship, priced });
    expect(r).toEqual({ id: "o1", orderNumber: "AP-1001" });
    expect(callArgs(orderQ, "insert")?.[0]).toMatchObject({
      customer_id: "u1", email: "j@lab.org", status: "awaiting_payment", ship_state: "TX",
      subtotal_cents: 9800, shipping_cents: 1500, insurance_cents: 550, tax_cents: 0, total_cents: 11850,
    });
    expect(callArgs(itemsQ, "insert")?.[0]).toEqual([expect.objectContaining({ order_id: "o1", lot_number: "AP-0001", quantity: 2, line_total_cents: 9800 })]);
  });

  it("countOrdersForOwner tallies each status and all, skipping unpaid checkouts", async () => {
    const q = query({ data: [{ status: "paid" }, { status: "paid" }, { status: "shipped" }, { status: "cancelled" }] });
    from = fromQueue({ orders: [q] });
    const { countOrdersForOwner } = await import("@/lib/orders");
    expect(await countOrdersForOwner()).toEqual({ paid: 2, processing: 0, shipped: 1, all: 4 });
    expect(callArgs(q, "neq")).toEqual(["status", "awaiting_payment"]);
  });

  it("createPendingOrder removes the order if the items insert fails", async () => {
    const orderQ = query({ data: { id: "o1", order_number: "AP-1001" } });
    const itemsQ = query({ error: { message: "boom" } });
    const deleteQ = query({});
    from = fromQueue({ orders: [orderQ, deleteQ], order_items: [itemsQ] });
    const { createPendingOrder } = await import("@/lib/orders");
    await expect(createPendingOrder({ customerId: "u1", email: "j@lab.org", ship, priced })).rejects.toThrow();
    expect(deleteQ.calls.map(([m]) => m)).toContain("delete");
  });

  it("createPendingOrder records the partner, discount, store credit and pre-computed tax", async () => {
    const orderQ = query({ data: { id: "o1", order_number: "AP-1001" } });
    from = fromQueue({ orders: [orderQ], order_items: [query({})] });
    const { createPendingOrder } = await import("@/lib/orders");
    await createPendingOrder({
      customerId: "u1", email: "j@lab.org", ship, priced: { ...priced, partnerDiscountCents: 980, totalBeforeTaxCents: 10870 },
      partner: { partnerId: "p1", attributedBy: "code" }, storeCreditCents: 5000, taxCents: 897, taxCalculationId: "taxcalc_1",
    });
    expect(callArgs(orderQ, "insert")?.[0]).toMatchObject({
      partner_id: "p1", attributed_by: "code", partner_discount_cents: 980, store_credit_cents: 5000,
      tax_cents: 897, total_cents: 10870 + 897, tax_calculation_id: "taxcalc_1",
    });
  });

  it("transitionOrder refuses illegal moves without touching the database", async () => {
    from = fromQueue({});
    const { transitionOrder } = await import("@/lib/orders");
    await expect(transitionOrder("o1", "shipped", "paid")).rejects.toThrow("Illegal order transition shipped → paid");
  });

  it("transitionOrder only updates when the current status still matches, and stamps the time", async () => {
    const q = query({ data: [{ id: "o1" }] });
    from = fromQueue({ orders: [q] });
    const { transitionOrder } = await import("@/lib/orders");
    expect(await transitionOrder("o1", "paid", "shipped", { tracking_number: "9400" })).toBe(true);
    expect(callArgs(q, "update")?.[0]).toMatchObject({ status: "shipped", tracking_number: "9400", shipped_at: expect.any(String) });
    expect(q.calls.filter(([m]) => m === "eq").map(([, a]) => a)).toEqual([["id", "o1"], ["status", "paid"]]);
  });

  it("transitionOrder returns false when another process already moved the order", async () => {
    from = fromQueue({ orders: [query({ data: [] })] });
    const { transitionOrder } = await import("@/lib/orders");
    expect(await transitionOrder("o1", "awaiting_payment", "paid")).toBe(false);
  });

  it("beginStripeEvent reports duplicates only for already-processed events", async () => {
    from = fromQueue({ stripe_events: [query({ error: { code: "23505" } }), query({ data: { processed_at: "2026-09-28" } })] });
    const { beginStripeEvent } = await import("@/lib/orders");
    expect(await beginStripeEvent("evt_1", "checkout.session.completed")).toBe("duplicate");
    from = fromQueue({ stripe_events: [query({ error: { code: "23505" } }), query({ data: { processed_at: null } })] });
    expect(await beginStripeEvent("evt_1", "checkout.session.completed")).toBe("process");
    from = fromQueue({ stripe_events: [query({})] });
    expect(await beginStripeEvent("evt_2", "checkout.session.completed")).toBe("process");
  });
});
