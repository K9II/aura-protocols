import { describe, it, expect, vi, beforeEach } from "vitest";

const requireOwner = vi.fn();
const getOrderById = vi.fn();
const transitionOrder = vi.fn();
const sendOrAlert = vi.fn();
const markCommissionClearing = vi.fn();
vi.mock("@/lib/dal", () => ({ requireOwner }));
vi.mock("@/lib/orders", () => ({ getOrderById, transitionOrder }));
vi.mock("@/lib/notify", () => ({ sendOrAlert }));
vi.mock("@/lib/partners/ledger", () => ({ markCommissionClearing }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

function fd(v: Record<string, string>) { const f = new FormData(); for (const [k, x] of Object.entries(v)) f.set(k, x); return f; }
const id = "11111111-1111-4111-8111-111111111111";

describe("markShippedAction", () => {
  beforeEach(() => { vi.resetModules(); for (const f of [requireOwner, getOrderById, transitionOrder, sendOrAlert, markCommissionClearing]) f.mockReset(); });

  it("is owner-only", async () => {
    requireOwner.mockRejectedValue(new Error("NOT_FOUND"));
    const { markShippedAction } = await import("@/app/admin/orders/actions");
    await expect(markShippedAction(fd({ orderId: id, tracking: "9400111899223344556677", carrier: "usps" }))).rejects.toThrow("NOT_FOUND");
    expect(transitionOrder).not.toHaveBeenCalled();
  });

  it("marks a paid order shipped with tracking and emails the customer", async () => {
    requireOwner.mockResolvedValue({ id: "owner" });
    const ship = { ship_name: "J. Rivera", ship_line1: "1 A St", ship_line2: null, ship_city: "Austin", ship_state: "TX", ship_zip: "78701" };
    getOrderById.mockResolvedValueOnce({ id, status: "paid", email: "j@lab.org", order_number: "AP-1001", ...ship })
      .mockResolvedValueOnce({ id, status: "shipped", email: "j@lab.org", order_number: "AP-1001", tracking_number: "9400111899223344556677", carrier: "usps", ...ship });
    transitionOrder.mockResolvedValue(true);
    const { markShippedAction } = await import("@/app/admin/orders/actions");
    await markShippedAction(fd({ orderId: id, tracking: " 9400 1118 9922 3344 5566 77 ", carrier: "usps" }));
    expect(transitionOrder).toHaveBeenCalledWith(id, "paid", "shipped", { tracking_number: "9400111899223344556677", carrier: "usps" });
    expect(sendOrAlert.mock.calls[0][0]).toMatchObject({ to: "j@lab.org", subject: "Order AP-1001 has shipped" });
    expect(markCommissionClearing).toHaveBeenCalledWith(id, expect.any(String));
  });

  it("ignores bad input and non-paid orders", async () => {
    requireOwner.mockResolvedValue({ id: "owner" });
    const { markShippedAction } = await import("@/app/admin/orders/actions");
    await markShippedAction(fd({ orderId: id, tracking: "x", carrier: "usps" }));
    getOrderById.mockResolvedValue({ id, status: "cancelled" });
    await markShippedAction(fd({ orderId: id, tracking: "9400111899223344556677", carrier: "usps" }));
    expect(transitionOrder).not.toHaveBeenCalled();
    expect(markCommissionClearing).not.toHaveBeenCalled();
  });
});
