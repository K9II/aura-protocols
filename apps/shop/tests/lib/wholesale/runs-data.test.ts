import { describe, it, expect, vi, beforeEach } from "vitest";
import { query, fromQueue, callArgs } from "../../helpers/supabase-mock";

let from: ReturnType<typeof fromQueue>;
const rpc = vi.fn();
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: (t: string) => from(t), rpc }) }));
vi.mock("@/lib/wholesale/data", () => ({ getWholesaleSettings: async () => ({ runDays: 14, nextCutoffOverride: null, balanceDays: 7 }) }));

describe("run data", () => {
  beforeEach(() => { vi.resetModules(); rpc.mockReset(); });

  it("ensureRun calls ensure_production_run and throws on error", async () => {
    rpc.mockResolvedValueOnce({ data: "r1", error: null });
    const { ensureRun } = await import("@/lib/wholesale/runs-data");
    expect(await ensureRun("2026-10-19")).toBe("r1");
    expect(rpc).toHaveBeenCalledWith("ensure_production_run", { p_cutoff: "2026-10-19" });
    rpc.mockResolvedValueOnce({ data: null, error: { message: "x" } });
    await expect(ensureRun("2026-10-19")).rejects.toThrow(/ensure run/);
  });

  it("recordLineOrder upserts the line for the strength and logs the event", async () => {
    const up = query({ data: { id: "l1" } }), ev = query({});
    from = fromQueue({ production_run_lines: [up], production_run_events: [ev] });
    const { recordLineOrder } = await import("@/lib/wholesale/runs-data");
    await recordLineOrder({ runId: "r1", slug: "bpc-157", variantId: "10mg", kits: 23, extraBoxes: 2, supplier: "LKZ", costCents: 230000, ref: "PO-7" }, "owner");
    expect(callArgs(up, "upsert")?.[0]).toMatchObject({ run_id: "r1", slug: "bpc-157", variant_id: "10mg", kits_ordered: 23, extra_boxes: 2, supplier: "LKZ", cost_cents: 230000, supplier_ref: "PO-7" });
    expect(callArgs(ev, "insert")?.[0]).toMatchObject({ run_id: "r1", line_id: "l1", kind: "line_ordered", actor_id: "owner" });
  });

  it("passLine returns the function's result", async () => {
    rpc.mockResolvedValueOnce({ data: { ok: true, held: 2, short: [] }, error: null });
    const { passLine } = await import("@/lib/wholesale/runs-data");
    expect(await passLine("l1", "owner")).toEqual({ ok: true, held: 2, short: [] });
    expect(rpc).toHaveBeenCalledWith("pass_run_line", { p_line: "l1", p_actor: "owner" });
  });

  it("logOnce ignores a duplicate event_key (already done) and throws on other errors", async () => {
    from = fromQueue({ production_run_events: [query({ error: { code: "23505" } }), query({ error: { code: "XX", message: "down" } })] });
    const { logOnce } = await import("@/lib/wholesale/runs-data");
    expect(await logOnce({ runId: "r1", kind: "reminder_sent", key: "reminder:o1" })).toBe(false);
    await expect(logOnce({ runId: "r1", kind: "reminder_sent", key: "reminder:o2" })).rejects.toThrow(/run event/);
  });

  it("wholesaleTodos: the collecting run, a closed run not ordered, a failed lot, balances due/overdue", async () => {
    const runs = query({ data: [
      { id: "r3", number: "R-1003", cutoff_on: "2026-10-19", notes: "", created_at: "x" },
      { id: "r2", number: "R-1002", cutoff_on: "2026-10-05", notes: "", created_at: "x" },
    ] });
    const due = query({ data: [
      { id: "o8", order_number: "AP-8", status: "balance_due", balance_due_at: "2026-10-01T15:00:00Z", wholesale_cutoff_on: "2026-09-21", order_items: [] },
      { id: "o9", order_number: "AP-9", status: "balance_due", balance_due_at: "2026-10-12T15:00:00Z", wholesale_cutoff_on: "2026-09-21", order_items: [] },
    ] });
    const orders = query({ data: [
      { id: "o1", order_number: "AP-1", status: "deposit_paid", wholesale_cutoff_on: "2026-10-19", order_items: [{ compound_slug: "bpc-157", variant_id: "10mg", quantity: 5 }] },
      { id: "o2", order_number: "AP-2", status: "deposit_paid", wholesale_cutoff_on: "2026-10-05", order_items: [{ compound_slug: "retatrutide", variant_id: "10mg", quantity: 3 }, { compound_slug: "tb-500", variant_id: "10mg", quantity: 2 }] },
    ] });
    const lines = query({ data: [{ id: "l1", slug: "retatrutide", variant_id: "10mg", ordered_at: "x", result: "failed", lot_id: "lot" }] });
    from = fromQueue({ production_runs: [runs], orders: [due, orders], production_run_lines: [lines] });
    const { wholesaleTodos } = await import("@/lib/wholesale/runs-data");
    expect(await wholesaleTodos(Date.parse("2026-10-13T16:00:00Z"))).toEqual({
      collecting: { id: "r3", number: "R-1003", cutoff: "2026-10-19", orders: 1, kits: 5 },
      toOrder: [{ id: "r2", number: "R-1002", days: 8, strengths: ["TB-500 10 mg"] }],
      failed: [{ runId: "r2", number: "R-1002", label: "APro-G3RT (Retatrutide) 10 mg" }],
      balances: { due: 2, overdue: 1 },
    });
  });
});
