import { describe, it, expect, vi, beforeEach } from "vitest";

const list = vi.fn();
const getOrderById = vi.fn();
const transitionOrder = vi.fn();
const applyPaid = vi.fn();
const alertOwner = vi.fn();
const listOrphanedPendingOrders = vi.fn();
const pruneLookups = vi.fn();
const pruneCodeAttempts = vi.fn();
const lotIntegrity = vi.fn();
vi.mock("@/lib/stripe", () => ({ getStripe: () => ({ checkout: { sessions: { list } } }) }));
vi.mock("@/lib/orders", () => ({ getOrderById, transitionOrder, listOrphanedPendingOrders }));
vi.mock("@/lib/stripe-events", () => ({ applyPaid }));
vi.mock("@/lib/notify", () => ({ alertOwner }));
vi.mock("@/lib/account/data", () => ({ pruneLookups }));
vi.mock("@/lib/discounts/data", () => ({ pruneCodeAttempts }));
vi.mock("@/lib/catalog-ops/data", () => ({ lotIntegrity }));

const get = (auth?: string) => new Request("http://localhost/api/cron/reconcile", { headers: auth ? { authorization: auth } : {} });
async function* pages(items: unknown[]) { for (const i of items) yield i; }

describe("GET /api/cron/reconcile", () => {
  beforeEach(() => { vi.resetModules(); for (const f of [list, getOrderById, transitionOrder, applyPaid, alertOwner, listOrphanedPendingOrders, pruneLookups, pruneCodeAttempts, lotIntegrity]) f.mockReset(); listOrphanedPendingOrders.mockResolvedValue([]); pruneLookups.mockResolvedValue(undefined); pruneCodeAttempts.mockResolvedValue(undefined); lotIntegrity.mockResolvedValue({ negative: [], stale_holds: [] }); process.env.CRON_SECRET = "s3cret"; });

  it("requires the cron secret", async () => {
    const { GET } = await import("@/app/api/cron/reconcile/route");
    expect((await GET(get())).status).toBe(401);
    expect((await GET(get("Bearer wrong"))).status).toBe(401);
  });

  it("marks paid sessions whose order is still unpaid, cancels expired ones, and alerts the owner", async () => {
    list.mockReturnValue(pages([
      { id: "cs_1", metadata: { order_id: "o1" }, payment_status: "paid", status: "complete" },
      { id: "cs_2", metadata: { order_id: "o2" }, payment_status: "unpaid", status: "expired" },
      { id: "cs_3", metadata: { order_id: "o3" }, payment_status: "paid", status: "complete" },
    ]));
    getOrderById.mockImplementation(async (id: string) => ({ o1: { id: "o1", status: "awaiting_payment", order_number: "AP-1" }, o2: { id: "o2", status: "awaiting_payment", order_number: "AP-2" }, o3: { id: "o3", status: "paid", order_number: "AP-3" } })[id]);
    applyPaid.mockResolvedValue(true);
    transitionOrder.mockResolvedValue(true);
    const { GET } = await import("@/app/api/cron/reconcile/route");
    const res = await GET(get("Bearer s3cret"));
    expect(await res.json()).toEqual({ checked: 3, fixedPaid: ["AP-1"], cancelled: ["AP-2"], failed: [] });
    expect(transitionOrder).toHaveBeenCalledWith("o2", "awaiting_payment", "cancelled");
    expect(alertOwner).toHaveBeenCalledWith(expect.stringContaining("Reconciler"), expect.stringContaining("AP-1"));
  });

  it("cancels pending orders that never got a Stripe page (credit they hold is returned by the cancel trigger)", async () => {
    list.mockReturnValue(pages([]));
    listOrphanedPendingOrders.mockResolvedValue([{ id: "o7", order_number: "AP-7" }]);
    transitionOrder.mockResolvedValue(true);
    const { GET } = await import("@/app/api/cron/reconcile/route");
    const body = await (await GET(get("Bearer s3cret"))).json();
    expect(listOrphanedPendingOrders.mock.calls[0][0] < new Date(Date.now() - 60 * 60 * 1000 + 1000).toISOString()).toBe(true);
    expect(transitionOrder).toHaveBeenCalledWith("o7", "awaiting_payment", "cancelled");
    expect(body.cancelled).toEqual(["AP-7"]);
  });

  it("isolates a session that throws, keeps processing the rest, and reports the failure", async () => {
    list.mockReturnValue(pages([
      { id: "cs_1", metadata: { order_id: "o1" }, payment_status: "paid", status: "complete" },
      { id: "cs_2", metadata: { order_id: "o2" }, payment_status: "unpaid", status: "expired" },
    ]));
    getOrderById.mockImplementation(async (id: string) => {
      if (id === "o1") throw new Error("boom");
      return ({ o2: { id: "o2", status: "awaiting_payment", order_number: "AP-2" } } as Record<string, unknown>)[id];
    });
    transitionOrder.mockResolvedValue(true);
    const { GET } = await import("@/app/api/cron/reconcile/route");
    const res = await GET(get("Bearer s3cret"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.checked).toBe(2);
    expect(body.cancelled).toEqual(["AP-2"]);
    expect(body.failed).toHaveLength(1);
    expect(body.failed[0]).toEqual(expect.stringContaining("cs_1"));
    expect(body.failed[0]).toEqual(expect.stringContaining("boom"));
    expect(transitionOrder).toHaveBeenCalledWith("o2", "awaiting_payment", "cancelled");
    expect(alertOwner).toHaveBeenCalledWith("Reconcile had failures", expect.stringMatching(/^1 failed:[\s\S]*cs_1/));
  });

  it("alerts the owner and returns 500 if listing Stripe sessions itself fails", async () => {
    list.mockImplementation(() => { throw new Error("stripe outage"); });
    const { GET } = await import("@/app/api/cron/reconcile/route");
    const res = await GET(get("Bearer s3cret"));
    expect(res.status).toBe(500);
    expect(alertOwner).toHaveBeenCalledWith(expect.stringContaining("Reconcile"), expect.stringContaining("stripe outage"));
  });

  it("prunes old gate lookups and reports a prune failure without failing the run", async () => {
    list.mockReturnValue(pages([]));
    pruneLookups.mockRejectedValueOnce(new Error("db down"));
    const { GET } = await import("@/app/api/cron/reconcile/route");
    const res = await GET(get("Bearer s3cret"));
    expect(res.status).toBe(200);
    expect((await res.json()).failed).toEqual(expect.arrayContaining([expect.stringMatching(/gate lookups prune/)]));
  });

  it("prunes old code attempts once per run and reports a prune failure without failing the run", async () => {
    list.mockReturnValue(pages([]));
    pruneCodeAttempts.mockRejectedValueOnce(new Error("db down"));
    const { GET } = await import("@/app/api/cron/reconcile/route");
    const res = await GET(get("Bearer s3cret"));
    expect(res.status).toBe(200);
    expect(pruneCodeAttempts).toHaveBeenCalledTimes(1);
    expect((await res.json()).failed).toEqual(expect.arrayContaining([expect.stringMatching(/code attempts prune/)]));
  });

  it("alerts when a lot is below zero or holds are stuck on finished orders", async () => {
    list.mockReturnValue(pages([]));
    lotIntegrity.mockResolvedValue({ negative: ["BPC-2609-01"], stale_holds: ["AP-1101"] });
    const { GET } = await import("@/app/api/cron/reconcile/route");
    await GET(get("Bearer s3cret"));
    expect(alertOwner).toHaveBeenCalledWith("Reconcile: stock needs a look",
      "Lots below zero: BPC-2609-01\nHeld vials on finished orders: AP-1101");
  });

  it("stays quiet when stock is consistent", async () => {
    list.mockReturnValue(pages([]));
    lotIntegrity.mockResolvedValue({ negative: [], stale_holds: [] });
    const { GET } = await import("@/app/api/cron/reconcile/route");
    await GET(get("Bearer s3cret"));
    expect(alertOwner).not.toHaveBeenCalledWith("Reconcile: stock needs a look", expect.anything());
  });

  it("reports a lot integrity failure without failing the run", async () => {
    list.mockReturnValue(pages([]));
    lotIntegrity.mockRejectedValueOnce(new Error("db down"));
    const { GET } = await import("@/app/api/cron/reconcile/route");
    const res = await GET(get("Bearer s3cret"));
    expect(res.status).toBe(200);
    expect((await res.json()).failed).toEqual(expect.arrayContaining([expect.stringMatching(/lot integrity/)]));
  });
});
