import { describe, it, expect, vi, beforeEach } from "vitest";
import { query } from "../../helpers/supabase-mock";

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
});
