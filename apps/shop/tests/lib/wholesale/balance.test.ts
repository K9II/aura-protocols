import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({
  getOrderById: vi.fn(), transitionOrder: vi.fn(), alertOwner: vi.fn(), sendOrAlert: vi.fn(),
  getWholesaleSettings: vi.fn(), runLines: vi.fn(), runOrders: vi.fn(), logOnce: vi.fn(),
}));
vi.mock("@/lib/orders", () => ({ getOrderById: m.getOrderById, transitionOrder: m.transitionOrder }));
vi.mock("@/lib/notify", () => ({ alertOwner: m.alertOwner, sendOrAlert: m.sendOrAlert }));
vi.mock("@/lib/wholesale/data", () => ({ getWholesaleSettings: m.getWholesaleSettings }));
vi.mock("@/lib/wholesale/runs-data", () => ({ runLines: m.runLines, runOrders: m.runOrders, logOnce: m.logOnce }));
vi.mock("@/lib/supabase/env", () => ({ siteUrl: () => "https://auraprotocols.com" }));
vi.mock("@/lib/clock", () => ({ currentMs: () => Date.parse("2026-10-29T16:00:00Z") }));
const { getOrderById, transitionOrder, sendOrAlert, runLines, runOrders, logOnce } = m;

describe("wholesale balance", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const f of Object.values(m)) f.mockReset();
    m.getWholesaleSettings.mockResolvedValue({ balanceDays: 7, leadDays: 28 });
    sendOrAlert.mockResolvedValue(true);
  });

it("releaseReadyOrders moves every deposit-paid order whose strengths all passed to balance_due, emails once", async () => {
  runLines.mockResolvedValue([{ slug: "bpc-157", variant_id: "10mg", result: "passed" }, { slug: "tb-500", variant_id: "10mg", result: "pending" }]);
  runOrders.mockResolvedValue([
    { id: "o1", order_number: "AP-1", status: "deposit_paid", items: [{ compound_slug: "bpc-157", variant_id: "10mg", quantity: 5 }] },
    { id: "o2", order_number: "AP-2", status: "deposit_paid", items: [{ compound_slug: "tb-500", variant_id: "10mg", quantity: 5 }] },
  ]);
  transitionOrder.mockResolvedValue(true);
  getOrderById.mockResolvedValue({ id: "o1", order_number: "AP-1", email: "a@b", balance_cents: 100, order_items: [] });
  logOnce.mockResolvedValue(true);
  const { releaseReadyOrders } = await import("@/lib/wholesale/balance");
  expect(await releaseReadyOrders({ id: "r1", cutoff_on: "2026-10-19" })).toEqual(["AP-1"]);
  expect(transitionOrder).toHaveBeenCalledWith("o1", "deposit_paid", "balance_due", { balance_due_at: expect.any(String) });
  expect(sendOrAlert).toHaveBeenCalledTimes(1);
});
it("afterLineFailed emails every deposit-paid order holding that strength, once", async () => {
  runOrders.mockResolvedValue([
    { id: "o1", order_number: "AP-1", status: "deposit_paid", items: [{ compound_slug: "retatrutide", variant_id: "10mg", quantity: 5 }] },
    { id: "o2", order_number: "AP-2", status: "deposit_paid", items: [{ compound_slug: "bpc-157", variant_id: "10mg", quantity: 5 }] },
  ]);
  logOnce.mockResolvedValueOnce(true);
  getOrderById.mockResolvedValue({ id: "o1", order_number: "AP-1", email: "a@b", order_items: [] });
  sendOrAlert.mockResolvedValue(true);
  const { afterLineFailed } = await import("@/lib/wholesale/balance");
  expect(await afterLineFailed({ id: "r1", cutoff_on: "2026-10-19" }, { id: "l9", slug: "retatrutide", variant_id: "10mg", strength: "10 mg", name: "Retatrutide" })).toBe(1);
  expect(logOnce).toHaveBeenCalledWith(expect.objectContaining({ kind: "lot_failed_emailed", key: "failed:l9:o1" }));
  expect(sendOrAlert).toHaveBeenCalledTimes(1);
});

});
