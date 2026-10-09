import { describe, it, expect, vi, beforeEach } from "vitest";
import { query, fromQueue, callArgs } from "../../helpers/supabase-mock";

let from: ReturnType<typeof fromQueue>;
const rpc = vi.fn();
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: (t: string) => from(t), rpc }) }));

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
});
