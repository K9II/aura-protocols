import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({
  getOrderById: vi.fn(), transitionOrder: vi.fn(), alertOwner: vi.fn(), sendOrAlert: vi.fn(), getWholesaleSettings: vi.fn(),
  balanceDueOrders: vi.fn(), cutoffsWithoutRuns: vi.fn(), ensureRun: vi.fn(), listRuns: vi.fn(), logOnce: vi.fn(),
  runByCutoff: vi.fn(), runLines: vi.fn(), runOrders: vi.fn(),
}));
vi.mock("@/lib/orders", () => ({ getOrderById: m.getOrderById, transitionOrder: m.transitionOrder }));
vi.mock("@/lib/notify", () => ({ alertOwner: m.alertOwner, sendOrAlert: m.sendOrAlert }));
vi.mock("@/lib/wholesale/data", () => ({ getWholesaleSettings: m.getWholesaleSettings }));
vi.mock("@/lib/supabase/env", () => ({ siteUrl: () => "https://auraprotocols.com" }));
vi.mock("@/lib/wholesale/runs-data", () => ({
  balanceDueOrders: m.balanceDueOrders, cutoffsWithoutRuns: m.cutoffsWithoutRuns, ensureRun: m.ensureRun, listRuns: m.listRuns,
  logOnce: m.logOnce, runByCutoff: m.runByCutoff, runLines: m.runLines, runOrders: m.runOrders,
}));

const DUE_AT = "2026-11-12T15:00:00Z";
const run = { id: "r1", number: "R-1002", cutoff_on: "2026-10-05", notes: "", created_at: "x" };
const owed = (o: Record<string, unknown> = {}) => ({ id: "o1", order_number: "AP-1051", status: "balance_due", balance_due_at: DUE_AT, balance_cents: 190150,
  deposit_cents: 126400, wholesale_cutoff_on: "2026-10-05", items: [], ...o });
const at = (iso: string) => Date.parse(iso);

describe("runWholesaleCron", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const f of Object.values(m)) f.mockReset();
    m.getWholesaleSettings.mockResolvedValue({ balanceDays: 7 });
    m.cutoffsWithoutRuns.mockResolvedValue([]);
    m.listRuns.mockResolvedValue([]);
    m.balanceDueOrders.mockResolvedValue([]);
    m.runByCutoff.mockResolvedValue(run);
    m.logOnce.mockResolvedValue(true);
    m.sendOrAlert.mockResolvedValue(true);
    m.getOrderById.mockResolvedValue({ id: "o1", order_number: "AP-1051", email: "i@m.org", balance_cents: 190150, order_items: [] });
  });

  it("creates a run for every cutoff with deposits and no run", async () => {
    m.cutoffsWithoutRuns.mockResolvedValue(["2026-10-19"]);
    const { runWholesaleCron } = await import("@/lib/wholesale/cron");
    expect((await runWholesaleCron(at("2026-10-20T15:00:00Z"))).runsCreated).toBe(1);
    expect(m.ensureRun).toHaveBeenCalledWith("2026-10-19");
  });

  it("day 5: reminder email, once", async () => {
    m.balanceDueOrders.mockResolvedValue([owed()]);
    const { runWholesaleCron } = await import("@/lib/wholesale/cron");
    expect((await runWholesaleCron(at("2026-11-17T16:00:00Z"))).reminders).toBe(1);
    expect(m.logOnce).toHaveBeenCalledWith(expect.objectContaining({ kind: "reminder_sent", key: "reminder:o1" }));
    expect(m.sendOrAlert.mock.calls[0][0].subject).toBe("Order AP-1051 — balance due Nov 19");
    m.logOnce.mockResolvedValue(false);
    m.sendOrAlert.mockClear();
    expect((await runWholesaleCron(at("2026-11-17T16:00:00Z"))).reminders).toBe(0);
    expect(m.sendOrAlert).not.toHaveBeenCalled();
  });

  it("day 7: the owner hears the order cancels tomorrow", async () => {
    m.balanceDueOrders.mockResolvedValue([owed()]);
    const { runWholesaleCron } = await import("@/lib/wholesale/cron");
    expect((await runWholesaleCron(at("2026-11-19T16:00:00Z"))).overdue).toBe(1);
    expect(m.alertOwner).toHaveBeenCalledWith("Wholesale balance overdue", expect.stringContaining("AP-1051"));
    expect(m.transitionOrder).not.toHaveBeenCalled();
  });

  it("day 8: cancelled (deposit kept), owner alerted, buyer emailed", async () => {
    m.balanceDueOrders.mockResolvedValue([owed()]);
    m.transitionOrder.mockResolvedValue(true);
    const { runWholesaleCron } = await import("@/lib/wholesale/cron");
    expect((await runWholesaleCron(at("2026-11-20T16:00:00Z"))).forfeited).toBe(1);
    expect(m.transitionOrder).toHaveBeenCalledWith("o1", "balance_due", "cancelled");
    expect(m.alertOwner).toHaveBeenCalledWith("Wholesale order forfeited", expect.stringContaining("deposit $1,264.00 kept"));
    expect(m.sendOrAlert.mock.calls[0][0].subject).toBe("Order AP-1051 cancelled — balance not received");
  });

  it("a run past its cutoff with a strength not ordered alerts once; one failing order doesn't stop the rest", async () => {
    m.listRuns.mockResolvedValue([run]);
    m.runLines.mockResolvedValue([]);
    m.runOrders.mockResolvedValue([{ id: "o2", status: "deposit_paid", items: [{ compound_slug: "bpc-157", variant_id: "10mg", quantity: 5 }] }]);
    m.balanceDueOrders.mockResolvedValue([owed({ id: "bad", order_number: "AP-9", wholesale_cutoff_on: "2026-09-01" }), owed()]);
    m.runByCutoff.mockImplementation(async (c: string) => (c === "2026-10-05" ? run : null));
    const { runWholesaleCron } = await import("@/lib/wholesale/cron");
    const r = await runWholesaleCron(at("2026-11-17T16:00:00Z"));
    expect(r.failed).toEqual(["balance AP-9: no run for 2026-09-01"]);
    expect(r.reminders).toBe(1);
    expect(m.alertOwner).toHaveBeenCalledWith("Wholesale run not ordered", expect.stringContaining("bpc-157/10mg"));
  });
});
