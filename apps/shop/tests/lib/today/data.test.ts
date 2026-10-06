import { describe, it, expect, vi, beforeEach } from "vitest";
import { query, fromQueue, callArgs } from "../../helpers/supabase-mock";

const db = vi.hoisted(() => ({ rpc: vi.fn(), from: null as null | ((t: string) => unknown) }));
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ rpc: db.rpc, from: (t: string) => db.from!(t) }) }));

describe("today data", () => {
  beforeEach(() => { vi.resetModules(); db.rpc.mockReset(); });

  it("sales summary calls admin_sales_summary for the range and maps every number", async () => {
    db.rpc.mockResolvedValue({ data: {
      sales_cents: "134650", orders: 5, charged_cents: 143118, shipping_cents: 2750, tax_cents: 5718, refunded_cents: 0, refunded_orders: 0,
      first_time_orders: 3, repeat_orders: 2, new_accounts: 11,
      buckets: [{ at: "2026-10-06T07:00", cents: "100000" }],
      top: [{ name: "BPC-157", strength: "10 mg", vials: "6", cents: 41400 }],
    }, error: null });
    const { salesSummary } = await import("@/lib/today/data");
    const s = await salesSummary({ from: "2026-10-06T06:00:00.000Z", to: "2026-10-06T15:42:00.000Z" }, "hour");
    expect(db.rpc).toHaveBeenCalledWith("admin_sales_summary", { p_from: "2026-10-06T06:00:00.000Z", p_to: "2026-10-06T15:42:00.000Z", p_bucket: "hour" });
    expect(s).toEqual({
      salesCents: 134650, orders: 5, chargedCents: 143118, shippingCents: 2750, taxCents: 5718, refundedCents: 0, refundedOrders: 0,
      firstTimeOrders: 3, repeatOrders: 2, newAccounts: 11,
      buckets: [{ at: "2026-10-06T07:00", cents: 100000 }],
      top: [{ name: "BPC-157", strength: "10 mg", vials: 6, cents: 41400 }],
    });
  });

  it("a sales summary error throws (the card shows Couldn't load, never zeros)", async () => {
    db.rpc.mockResolvedValue({ data: null, error: { message: "function admin_sales_summary does not exist" } });
    const { salesSummary } = await import("@/lib/today/data");
    await expect(salesSummary({ from: "a", to: "b" }, "day")).rejects.toThrow(/admin_sales_summary failed/);
  });

  it("new inquiries: since the seen mark, newest first, previews capped", async () => {
    const settings = query({ data: { inquiries_seen_at: "2026-10-05T00:00:00Z" } });
    const list = query({ data: [{ id: "i1" }], count: 4 });
    db.from = fromQueue({ shop_settings: [settings], inquiries: [list] });
    const { newInquiries } = await import("@/lib/today/data");
    expect(await newInquiries()).toEqual({ count: 4, latest: [{ id: "i1" }] });
    expect(callArgs(list, "gt")).toEqual(["created_at", "2026-10-05T00:00:00Z"]);
    expect(callArgs(list, "order")).toEqual(["created_at", { ascending: false }]);
    expect(callArgs(list, "limit")).toEqual([3]);
  });

  it("never marked seen: every inquiry is new; a read error throws", async () => {
    const list = query({ data: [], count: 0 });
    db.from = fromQueue({ shop_settings: [query({ data: { inquiries_seen_at: null } }), query({ error: { message: "down" } })], inquiries: [list] });
    const { newInquiries } = await import("@/lib/today/data");
    expect(await newInquiries()).toEqual({ count: 0, latest: [] });
    expect(list.calls.some(([m]) => m === "gt")).toBe(false);
    await expect(newInquiries()).rejects.toThrow(/inquiries seen read failed/);
  });

  it("mark seen stores the time it was given and never moves backwards", async () => {
    const upd = query({});
    db.from = fromQueue({ shop_settings: [upd] });
    const { markInquiriesSeen } = await import("@/lib/today/data");
    await markInquiriesSeen("2026-10-06T14:03:00.123456+00:00");
    expect(callArgs(upd, "update")?.[0]).toEqual({ inquiries_seen_at: "2026-10-06T14:03:00.123456+00:00" });
    expect(callArgs(upd, "eq")).toEqual(["id", true]);
    expect(callArgs(upd, "or")).toEqual(["inquiries_seen_at.is.null,inquiries_seen_at.lt.2026-10-06T14:03:00.123456+00:00"]);
  });
});
