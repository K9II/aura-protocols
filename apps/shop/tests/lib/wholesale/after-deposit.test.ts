import { describe, it, expect, vi, beforeEach } from "vitest";

const getOrderById = vi.fn();
const sendOrAlert = vi.fn();
const alertOwner = vi.fn();
const getWholesaleSettings = vi.fn();
vi.mock("@/lib/orders", () => ({ getOrderById }));
vi.mock("@/lib/notify", () => ({ sendOrAlert, alertOwner, alertAddress: () => "owner@example.com" }));
vi.mock("@/lib/wholesale/data", () => ({ getWholesaleSettings }));

const order = (over: Record<string, unknown> = {}) => ({
  id: "o1", order_number: "AP-1050", email: "j@lab.org", deposit_cents: 60600, balance_cents: 99450,
  total_cents: 165850, wholesale_cutoff_on: "2026-10-19",
  ship_name: "Jane", ship_line1: "1 A St", ship_line2: null, ship_city: "Austin", ship_state: "TX", ship_zip: "78701",
  order_items: [{ compound_name: "BPC-157", strength: "10 mg", pack_qty: 10, quantity: 2, line_total_cents: 102000 }],
  ...over,
});

describe("afterDepositPaid", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const f of [getOrderById, sendOrAlert, alertOwner, getWholesaleSettings]) f.mockReset();
    sendOrAlert.mockResolvedValue(true);
    getWholesaleSettings.mockResolvedValue({ leadDays: 28 });
  });

  it("a normal order emails the customer and owner with the run's dates", async () => {
    getOrderById.mockResolvedValue(order());
    const { afterDepositPaid } = await import("@/lib/wholesale/after-deposit");
    const result = await afterDepositPaid("o1");
    expect(result).toEqual({ emailed: true });
    expect(sendOrAlert).toHaveBeenCalledTimes(2);
    const customerMsg = sendOrAlert.mock.calls[0][0];
    expect(customerMsg.to).toBe("j@lab.org");
    expect(customerMsg.html).toContain("Order-by date");
    const ownerMsg = sendOrAlert.mock.calls[1][0];
    expect(ownerMsg.to).toBe("owner@example.com");
    expect(alertOwner).not.toHaveBeenCalled();
  });

  it("a missing run cutoff alerts the owner instead of throwing; both emails still go out", async () => {
    getOrderById.mockResolvedValue(order({ wholesale_cutoff_on: null }));
    const { afterDepositPaid } = await import("@/lib/wholesale/after-deposit");
    const result = await afterDepositPaid("o1");
    expect(result).toEqual({ emailed: true });
    expect(alertOwner).toHaveBeenCalledWith("Wholesale order missing cutoff date", expect.stringContaining("AP-1050"));
    expect(sendOrAlert).toHaveBeenCalledTimes(2);
    const customerMsg = sendOrAlert.mock.calls[0][0];
    expect(customerMsg.to).toBe("j@lab.org");
    expect(customerMsg.html).not.toContain("Order-by date");
    const ownerMsg = sendOrAlert.mock.calls[1][0];
    expect(ownerMsg.to).toBe("owner@example.com");
  });
});
