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
    expect(d.customer).toEqual({ id: "c1", fullName: "Priya Raman", email: "praman@example.org", verified: true, blocked: false, paidOrders: 2, spentCents: 61_439 });
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
});
