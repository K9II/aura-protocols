import { describe, it, expect, vi, beforeEach } from "vitest";

const listOpenOrdersForCustomer = vi.fn(), transitionOrder = vi.fn();
vi.mock("@/lib/orders", async (orig) => ({ ...(await orig<typeof import("@/lib/orders")>()), listOpenOrdersForCustomer, transitionOrder }));
const adapter = { expireCheckout: vi.fn() } as unknown as import("@/lib/commerce").CommerceAdapter & { expireCheckout: ReturnType<typeof vi.fn> };

const now = Date.now();
const fresh = { id: "o1", order_number: "AP-1", stripe_session_id: null, created_at: new Date(now - 60_000).toISOString(), store_credit_cents: 0 };
const onStripe = { id: "o2", order_number: "AP-2", stripe_session_id: "cs_2", created_at: new Date(now - 60_000).toISOString(), store_credit_cents: 500 };

describe("closeOpenCheckouts", () => {
  beforeEach(() => { listOpenOrdersForCustomer.mockReset(); transitionOrder.mockReset(); adapter.expireCheckout.mockReset(); });

  it("checkout mode skips a fresh order with no Stripe page; expires and cancels the rest", async () => {
    listOpenOrdersForCustomer.mockResolvedValue([fresh, onStripe]);
    adapter.expireCheckout.mockResolvedValue("expired");
    const { closeOpenCheckouts } = await import("@/lib/checkout-close");
    expect(await closeOpenCheckouts("u1", adapter, { all: false })).toEqual({ closed: ["AP-2"], failed: [] });
    expect(transitionOrder).toHaveBeenCalledWith("o2", "awaiting_payment", "cancelled");
  });

  it("all mode (block) cancels every open order", async () => {
    listOpenOrdersForCustomer.mockResolvedValue([fresh, onStripe]);
    adapter.expireCheckout.mockResolvedValue("expired");
    const { closeOpenCheckouts } = await import("@/lib/checkout-close");
    expect((await closeOpenCheckouts("u1", adapter, { all: true })).closed).toEqual(["AP-1", "AP-2"]);
  });

  it("leaves a session that turns out paid to the webhook, and reports failures instead of throwing", async () => {
    listOpenOrdersForCustomer.mockResolvedValue([onStripe, { ...onStripe, id: "o3", order_number: "AP-3", stripe_session_id: "cs_3" }]);
    adapter.expireCheckout.mockResolvedValueOnce("complete").mockRejectedValueOnce(new Error("stripe down"));
    const { closeOpenCheckouts } = await import("@/lib/checkout-close");
    const r = await closeOpenCheckouts("u1", adapter, { all: true });
    expect(r.closed).toEqual([]);
    expect(r.failed).toEqual([{ id: "o3", orderNumber: "AP-3", sessionId: "cs_3", error: "Error: stripe down" }]);
    expect(transitionOrder).not.toHaveBeenCalled();
  });
});
