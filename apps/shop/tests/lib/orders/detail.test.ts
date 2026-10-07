import { describe, it, expect, vi, beforeEach } from "vitest";
import { query, fromQueue, callArgs } from "../../helpers/supabase-mock";

let from: ReturnType<typeof fromQueue>;
const getOrderByNumber = vi.fn();
const orderItemLots = vi.fn();
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: (t: string) => from(t) }) }));
vi.mock("@/lib/orders", () => ({ getOrderByNumber }));
vi.mock("@/lib/catalog-ops/data", () => ({ orderItemLots }));

const order = {
  id: "o1", order_number: "AP-1029", customer_id: "c1", email: "praman@example.org", status: "shipped", partner_id: "p1", discount_code_id: "dc1",
  created_at: "2026-09-30T20:48:00Z", paid_at: "2026-09-30T20:51:00Z", shipped_at: "2026-10-01T21:02:00Z", cancelled_at: null, refunded_at: null,
  carrier: "usps", tracking_number: "9400111899223344550112", stripe_payment_intent: "pi_1", store_credit_cents: 0, total_cents: 41_439,
  order_items: [{ id: "i1" }],
};
function tables(over: Partial<Record<string, ReturnType<typeof query>>> = {}) {
  return {
    customers: [over.customers ?? query({ data: { id: "c1", full_name: "Priya Raman", email_verified_at: "2026-09-01T00:00:00Z", blocked_at: null } })],
    orders: [over.orders ?? query({ data: [{ total_cents: 41_439 }, { total_cents: 20_000 }] })],
    discount_codes: [over.discount_codes ?? query({ data: { id: "dc1", code: "SPRING20", kind: "order_pct", value: 5, stack_on_top: true, free_shipping: false } })],
    partners: [over.partners ?? query({ data: { id: "p1", code: "QUINN10" } })],
    commissions: [over.commissions ?? query({ data: { amount_cents: 5_707, rate_pct: 15, state: "clearing", created_at: "2026-09-30T20:51:01Z", clears_at: "2026-10-16T21:02:00Z", voided_at: null } })],
    admin_events: [over.admin_events ?? query({ data: [{ action: "order_shipped", at: "2026-10-01T21:02:05Z", detail: "USPS 9400…", actor: { full_name: "Alvester Adams" } }] })],
    disputes: [over.disputes ?? query({ data: [] })],
    early_fraud_warnings: [over.early_fraud_warnings ?? query({ data: [] })],
    inquiries: [over.inquiries ?? query({ data: [] })],
  };
}

describe("getOrderDetail", () => {
  beforeEach(() => { vi.resetModules(); getOrderByNumber.mockReset(); orderItemLots.mockReset().mockResolvedValue(new Map()); });

  it("returns null for an unknown order", async () => {
    getOrderByNumber.mockResolvedValue(null);
    from = fromQueue({});
    const { getOrderDetail } = await import("@/lib/orders/detail");
    expect(await getOrderDetail("AP-9")).toBeNull();
  });

  it("flags.dispute is true only when the order has a dispute that isn't closed", async () => {
    getOrderByNumber.mockResolvedValue(order);
    from = fromQueue(tables({ disputes: query({ data: [{ id: "d1", status: "won", reason: "fraudulent", amount_cents: 1000, opened_at: "2026-09-01T00:00:00Z", closed_at: "2026-09-10T00:00:00Z", outcome: "won" }] }) }));
    const { getOrderDetail } = await import("@/lib/orders/detail");
    const closed = (await getOrderDetail("AP-1029"))!;
    expect(closed.flags.dispute).toBe(false);
    expect(closed.openDisputeId).toBeNull();

    from = fromQueue(tables({ disputes: query({ data: [
      { id: "d1", status: "won", reason: "fraudulent", amount_cents: 1000, opened_at: "2026-09-01T00:00:00Z", closed_at: "2026-09-10T00:00:00Z", outcome: "won" },
      { id: "d2", status: "needs_response", reason: "product_not_received", amount_cents: 2000, opened_at: "2026-10-01T00:00:00Z", closed_at: null, outcome: null },
    ] }) }));
    const { getOrderDetail: getOrderDetail2 } = await import("@/lib/orders/detail");
    const open = (await getOrderDetail2("AP-1029"))!;
    expect(open.flags.dispute).toBe(true);
    expect(open.openDisputeId).toBe("d2");
  });

  it("assembles customer, code, partner, flags and a timeline", async () => {
    getOrderByNumber.mockResolvedValue(order);
    const t = tables();
    // Capture these query objects before fromQueue's shift() consumes them —
    // t.orders/t.inquiries are empty by the time getOrderDetail returns.
    const ordersQuery = t.orders[0];
    const inquiriesQuery = t.inquiries[0];
    from = fromQueue(t);
    const { getOrderDetail } = await import("@/lib/orders/detail");
    const d = (await getOrderDetail("AP-1029"))!;
    expect(d.customer).toEqual({ id: "c1", fullName: "Priya Raman", email: "praman@example.org", verified: true, blocked: false, paidOrders: 2, spentCents: 61_439, noChargeOrders: 0 });
    expect(d.noCharge).toBeNull();
    expect(d.code?.code).toBe("SPRING20");
    expect(d.partner).toEqual({ id: "p1", code: "QUINN10" });
    expect(d.commission?.state).toBe("clearing");
    expect(d.flags).toEqual({ dispute: false, warning: false });
    expect(d.timeline[0]).toMatchObject({ key: "shipped", who: "Alvester Adams" });
    expect(callArgs(ordersQuery, "in")).toEqual(["status", ["paid", "shipped"]]);
    expect(callArgs(inquiriesQuery, "eq")).toEqual(["order_number", "AP-1029"]);
    expect(orderItemLots).toHaveBeenCalledWith(["i1"]);
  });

  it("throws when a read fails (the page shows the error screen, not a half-empty order)", async () => {
    getOrderByNumber.mockResolvedValue(order);
    from = fromQueue(tables({ disputes: query({ error: { message: "down" } }) }));
    const { getOrderDetail } = await import("@/lib/orders/detail");
    await expect(getOrderDetail("AP-1029")).rejects.toThrow(/order disputes read failed/);
  });

  it("counts sales and no-charge orders apart and reads who created a no-charge order and what it replaces", async () => {
    getOrderByNumber.mockResolvedValue({
      ...order, order_number: "AP-1061", status: "paid", partner_id: null, discount_code_id: null, shipped_at: null, stripe_payment_intent: null, total_cents: 0,
      kind: "no_charge", no_charge_reason: "replacement", no_charge_note: "2 vials cracked", replaces_order_id: "o0", created_by: "owner1",
      order_items: [{ id: "i1", pack_qty: 1, quantity: 2 }, { id: "i2", pack_qty: 1, quantity: 1 }],
    });
    const created = query({ data: { full_name: "Alvester" } }), orig = query({ data: { order_number: "AP-1052" } });
    from = fromQueue({
      ...tables({ orders: query({ data: [{ total_cents: 41_439, kind: "sale" }, { total_cents: 0, kind: "no_charge" }, { total_cents: 48_000, kind: "sale" }] }) }),
      customers: [query({ data: { id: "c1", full_name: "Dana Whitfield", email_verified_at: null, blocked_at: null } }), created],
      orders: [query({ data: [{ total_cents: 41_439, kind: "sale" }, { total_cents: 0, kind: "no_charge" }, { total_cents: 48_000, kind: "sale" }] }), orig],
      discount_codes: [], partners: [],
      admin_events: [query({ data: [{ action: "no_charge_created", at: "2026-10-06T16:22:02Z", detail: "Replacement · $192.00 retail · email: sent", actor: { full_name: "Alvester" } }] })],
    });
    const { getOrderDetail } = await import("@/lib/orders/detail");
    const d = (await getOrderDetail("AP-1061"))!;
    expect(d.customer).toMatchObject({ paidOrders: 2, spentCents: 89_439, noChargeOrders: 1 });
    expect(d.noCharge).toEqual({ reason: "replacement", note: "2 vials cracked", createdBy: "Alvester", replaces: "AP-1052" });
    expect(callArgs(created, "eq")).toEqual(["id", "owner1"]);
    expect(callArgs(orig, "eq")).toEqual(["id", "o0"]);
    expect(d.timeline.map((e) => e.key)).toEqual(["email", "created"]);
    expect(d.timeline[1]).toMatchObject({ sub: "Replacement for AP-1052", detail: "“2 vials cracked” · 3 vials held" });
  });
});

describe("orderFlags", () => {
  beforeEach(() => { vi.resetModules(); });

  it("reads the order's open disputes and unresolved warnings", async () => {
    from = fromQueue({ disputes: [query({ data: [{ closed_at: "2026-09-10T00:00:00Z" }] })], early_fraud_warnings: [query({ data: [{ resolved_at: null }] })] });
    const { orderFlags } = await import("@/lib/orders/detail");
    expect(await orderFlags("o1")).toEqual({ dispute: false, warning: true });
  });

  it("throws on a failed read", async () => {
    from = fromQueue({ disputes: [query({ data: null, error: { message: "down" } })], early_fraud_warnings: [query({ data: [] })] });
    const { orderFlags } = await import("@/lib/orders/detail");
    await expect(orderFlags("o1")).rejects.toThrow("order disputes read failed");
  });
});
