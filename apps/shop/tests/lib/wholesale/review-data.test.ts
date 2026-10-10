import { describe, it, expect, vi, beforeEach } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ rpc }) }));

describe("wholesale review data", () => {
  beforeEach(() => { vi.resetModules(); rpc.mockReset(); });

  it("unreviewedBuyers maps the RPC rows", async () => {
    rpc.mockResolvedValueOnce({ data: [{ order_id: "o1", order_number: "AP-1052", customer_id: "c1", full_name: "Dana Reyes", organization: "Reyes Lab",
      email: "dana@reyeslab.org", research_field: "pharmacology", deposit_cents: 124000, kits: 6, cutoff_on: "2026-10-19" }], error: null });
    const { unreviewedBuyers } = await import("@/lib/wholesale/data");
    expect(await unreviewedBuyers()).toEqual([{ orderId: "o1", orderNumber: "AP-1052", customerId: "c1", name: "Dana Reyes", organization: "Reyes Lab",
      email: "dana@reyeslab.org", field: "pharmacology", depositCents: 124000, kits: 6, cutoffOn: "2026-10-19" }]);
    expect(rpc).toHaveBeenCalledWith("admin_unreviewed_wholesale_buyers");
  });

  it("unreviewedBuyers throws on a read error (Today shows Couldn't load, never zero)", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "down" } });
    const { unreviewedBuyers } = await import("@/lib/wholesale/data");
    await expect(unreviewedBuyers()).rejects.toThrow(/unreviewed/);
  });

  it("markWholesaleReviewed returns ok / already / missing and throws on an error", async () => {
    const { markWholesaleReviewed } = await import("@/lib/wholesale/data");
    for (const r of ["ok", "already", "missing"]) {
      rpc.mockResolvedValueOnce({ data: r, error: null });
      expect(await markWholesaleReviewed("c1", "owner1")).toBe(r);
    }
    expect(rpc).toHaveBeenLastCalledWith("admin_mark_wholesale_reviewed", { p_customer: "c1", p_actor: "owner1" });
    rpc.mockResolvedValueOnce({ data: null, error: { message: "down" } });
    await expect(markWholesaleReviewed("c1", "owner1")).rejects.toThrow(/review/);
  });
});
