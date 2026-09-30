import { describe, it, expect, vi, beforeEach } from "vitest";

const list = vi.fn();
const getOrderById = vi.fn();
const transitionOrder = vi.fn();
const applyPaid = vi.fn();
const alertOwner = vi.fn();
vi.mock("@/lib/stripe", () => ({ getStripe: () => ({ checkout: { sessions: { list } } }) }));
vi.mock("@/lib/orders", () => ({ getOrderById, transitionOrder }));
vi.mock("@/lib/stripe-events", () => ({ applyPaid }));
vi.mock("@/lib/notify", () => ({ alertOwner }));

const get = (auth?: string) => new Request("http://localhost/api/cron/reconcile", { headers: auth ? { authorization: auth } : {} });
async function* pages(items: unknown[]) { for (const i of items) yield i; }

describe("GET /api/cron/reconcile", () => {
  beforeEach(() => { vi.resetModules(); for (const f of [list, getOrderById, transitionOrder, applyPaid, alertOwner]) f.mockReset(); process.env.CRON_SECRET = "s3cret"; });

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
    expect(await res.json()).toEqual({ checked: 3, fixedPaid: ["AP-1"], cancelled: ["AP-2"] });
    expect(transitionOrder).toHaveBeenCalledWith("o2", "awaiting_payment", "cancelled");
    expect(alertOwner).toHaveBeenCalledWith(expect.stringContaining("Reconciler"), expect.stringContaining("AP-1"));
  });
});
