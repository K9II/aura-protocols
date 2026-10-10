// tests/lib/wholesale/runs.test.ts
import { describe, it, expect } from "vitest";
import { kitsByStrength, lineStage, runStatus, orderReady, suppliersOk, balanceTiming, MAX_SUPPLIERS_PER_RUN, PAST_CUTOFF_ALERT_DAYS, supplierOptions, KNOWN_SUPPLIERS, prefillTotal } from "@/lib/wholesale/runs";

const line = (o: Record<string, unknown> = {}) => ({ id: "l1", slug: "bpc-157", variant_id: "10mg", kits_ordered: null, extra_boxes: 0, supplier: null,
  cost_cents: null, supplier_ref: null, ordered_at: null, lot_id: null, result: "pending" as const, result_at: null, fail_note: null, ...o });
const order = (o: Record<string, unknown> = {}) => ({ id: "o1", order_number: "AP-1", status: "deposit_paid" as const,
  items: [{ compound_slug: "bpc-157", variant_id: "10mg", quantity: 3 }], ...o });

describe("run rules", () => {
  it("kits per strength count only live orders (deposit paid, balance due, paid, shipped)", () => {
    const m = kitsByStrength([order(), order({ id: "o2", status: "refunded" }), order({ id: "o3", status: "balance_due", items: [{ compound_slug: "bpc-157", variant_id: "10mg", quantity: 2 }] })]);
    expect(m.get("bpc-157/10mg")).toBe(5);
  });

  it("line stage follows the stored fields", () => {
    expect(lineStage(line())).toBe("to_order");
    expect(lineStage(line({ ordered_at: "x" }))).toBe("ordered");
    expect(lineStage(line({ ordered_at: "x", lot_id: "lot" }))).toBe("received");
    expect(lineStage(line({ result: "passed" }))).toBe("passed");
    expect(lineStage(line({ result: "failed" }))).toBe("failed");
  });

  it("run status is derived from the date, lines and orders", () => {
    expect(runStatus("2026-10-19", "2026-10-19", [], [order()])).toBe("collecting");
    expect(runStatus("2026-10-19", "2026-10-20", [], [order()])).toBe("to_order");
    expect(runStatus("2026-10-19", "2026-10-20", [line({ ordered_at: "x" })], [order()])).toBe("in_production");
    expect(runStatus("2026-10-19", "2026-11-12", [line({ result: "passed" })], [order({ status: "balance_due" })])).toBe("ready_to_ship");
    expect(runStatus("2026-10-19", "2026-11-30", [line({ result: "passed" })], [order({ status: "shipped" }), order({ id: "o2", status: "cancelled" })])).toBe("done");
    expect(runStatus("2026-10-19", "2026-10-25", [], [])).toBe("done");
  });

  it("an order is ready for its balance when every strength it needs has passed", () => {
    const o = order({ items: [{ compound_slug: "bpc-157", variant_id: "10mg", quantity: 3 }, { compound_slug: "tb-500", variant_id: "10mg", quantity: 2 }] });
    expect(orderReady(o, [line({ result: "passed" })])).toBe(false);
    expect(orderReady(o, [line({ result: "passed" }), line({ id: "l2", slug: "tb-500", result: "passed" })])).toBe(true);
  });

  it("at most two suppliers per run", () => {
    expect(MAX_SUPPLIERS_PER_RUN).toBe(2);
    const ls = [line({ id: "a", supplier: "LKZ" }), line({ id: "b", supplier: "Uther" })];
    expect(suppliersOk(ls, "LKZ", "c")).toBe(true);
    expect(suppliersOk(ls, "Nana", "c")).toBe(false);
    expect(suppliersOk(ls, "Nana", "b")).toBe(true);   // replacing the only line that used Uther
  });

  it("balance timing: reminder on day 5, overdue alert on day 7, forfeit the day after", () => {
    const t = balanceTiming("2026-11-12T15:00:00Z", 7);
    expect(t.remindAt).toBe(Date.parse("2026-11-17T15:00:00Z"));
    expect(t.overdueAt).toBe(Date.parse("2026-11-19T15:00:00Z"));
    expect(t.forfeitAt).toBe(Date.parse("2026-11-20T15:00:00Z"));
    expect(PAST_CUTOFF_ALERT_DAYS).toBe(2);
  });
});

describe("supplierOptions", () => {
  it("a new run: the known suppliers, then ones used on earlier runs, no duplicates", () => {
    const r = supplierOptions([], ["HK Peptides", "lkz"]);
    expect(r.full).toBe(false);
    expect(r.options).toEqual([...KNOWN_SUPPLIERS, "HK Peptides"]);
  });
  it("the run's own supplier comes first", () => {
    expect(supplierOptions(["Uther"], []).options[0]).toBe("Uther");
  });
  it("a run with two suppliers offers only those two", () => {
    expect(supplierOptions(["LKZ", "HK Peptides"], ["Nana"])).toEqual({ options: ["LKZ", "HK Peptides"], full: true });
  });
});

describe("prefillTotal", () => {
  it("box price × boxes, as dollars for the input", () => {
    expect(prefillTotal(5200, 1)).toBe("52");
    expect(prefillTotal(5250, 3)).toBe("157.50");
  });
  it("blank without a price or boxes", () => {
    expect(prefillTotal(undefined, 2)).toBe("");
    expect(prefillTotal(5200, 0)).toBe("");
  });
});
