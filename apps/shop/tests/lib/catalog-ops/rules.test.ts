import { describe, it, expect } from "vitest";
import {
  parseReceive, isDiscrepancy, liveRefusal, parseCorrection, parsePrice, parseLowAt, parseSku,
  adminRows, rowsForTab, tabCounts, lotsMatch, soldOutMessage, coaObjectPath, COA_MAX_BYTES,
} from "@/lib/catalog-ops/rules";

const base = { lotNumber: "bpc-2610-03", purity: "99.4", method: "HPLC+MS", testedOn: "2026-10-02", ordered: "200", counted: "200", damaged: "0", note: "", coaPath: "BPC-2610-03/1.pdf" };

describe("parseReceive", () => {
  it("normalises the lot number and returns numbers", () => {
    const r = parseReceive(base, "2026-10-05");
    expect(r).toEqual({ ok: true, warnings: {}, value: {
      lotNumber: "BPC-2610-03", purityPct: 99.4, method: "HPLC+MS", testedOn: "2026-10-02",
      orderedQty: 200, countedQty: 200, damagedQty: 0, discrepancyNote: null, coaPath: "BPC-2610-03/1.pdf",
    } });
  });
  it("refuses bad lot numbers, purity outside 90–100, future test dates, damaged > counted", () => {
    const r = parseReceive({ ...base, lotNumber: "x", purity: "89", testedOn: "2026-10-06", damaged: "300" }, "2026-10-05");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.fieldErrors).sort()).toEqual(["damaged", "lotNumber", "purity", "testedOn"]);
  });
  it("a mismatch needs a note", () => {
    const r = parseReceive({ ...base, counted: "196", damaged: "2" }, "2026-10-05");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.note).toBe("Say what happened — the counts don't match the invoice.");
    expect(parseReceive({ ...base, counted: "196", damaged: "2", note: "Short 4; 2 cracked." }, "2026-10-05").ok).toBe(true);
  });
  it("warns (doesn't refuse) below the site's 99% claim", () => {
    const r = parseReceive({ ...base, purity: "98.6" }, "2026-10-05");
    expect(r.ok && r.warnings.purity).toBe("Below the 99% shown on the site.");
  });
  it("certificate is optional for a draft", () => {
    expect(parseReceive({ ...base, coaPath: "" }, "2026-10-05")).toMatchObject({ ok: true, value: { coaPath: null } });
  });
});

describe("isDiscrepancy / liveRefusal", () => {
  it("counted ≠ ordered or any damaged", () => {
    expect(isDiscrepancy(200, 200, 0)).toBe(false);
    expect(isDiscrepancy(200, 196, 0)).toBe(true);
    expect(isDiscrepancy(200, 200, 1)).toBe(true);
  });
  it("live needs draft + certificate + something sellable", () => {
    expect(liveRefusal({ status: "draft", coaPath: "x.pdf", sellable: 10 })).toBeNull();
    expect(liveRefusal({ status: "live", coaPath: "x.pdf", sellable: 10 })).toBe("This lot is already live.");
    expect(liveRefusal({ status: "draft", coaPath: null, sellable: 10 })).toBe("Attach the certificate first.");
    expect(liveRefusal({ status: "draft", coaPath: "x.pdf", sellable: 0 })).toBe("Nothing to sell — every vial is damaged.");
  });
});

describe("parseCorrection", () => {
  it("signed delta, reason required, Other needs a note", () => {
    expect(parseCorrection({ direction: "remove", vials: "3", reason: "damaged", note: "" })).toEqual({ ok: true, value: { delta: -3, reason: "damaged", note: null } });
    expect(parseCorrection({ direction: "add", vials: "2", reason: "found", note: "in bin B" })).toEqual({ ok: true, value: { delta: 2, reason: "found", note: "in bin B" } });
    const bad = parseCorrection({ direction: "add", vials: "0", reason: "other", note: "" });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(Object.keys(bad.fieldErrors).sort()).toEqual(["note", "vials"]);
  });
});

describe("parsePrice / parseLowAt / parseSku", () => {
  it("dollars to cents, > 0", () => {
    expect(parsePrice("79")).toEqual({ ok: true, value: 7900 });
    expect(parsePrice("$109.50")).toEqual({ ok: true, value: 10950 });
    expect(parsePrice("0").ok).toBe(false);
    expect(parsePrice("abc").ok).toBe(false);
  });
  it("low level 0–10000 whole vials", () => {
    expect(parseLowAt("20")).toEqual({ ok: true, value: 20 });
    expect(parseLowAt("-1").ok).toBe(false);
  });
  it("SKU upper-case letters, digits, dashes; empty clears", () => {
    expect(parseSku(" ap-ss31-10 ")).toEqual({ ok: true, value: "AP-SS31-10" });
    expect(parseSku("")).toEqual({ ok: true, value: null });
    expect(parseSku("bad sku!").ok).toBe(false);
  });
});

describe("admin rows + tabs", () => {
  const content = [{ slug: "bpc-157", name: "BPC-157", chemicalClass: "Peptide Fragments", variants: [{ id: "10mg", strength: "10 mg" }] },
                   { slug: "tb-500", name: "TB-500", chemicalClass: "Peptide Fragments", variants: [{ id: "10mg", strength: "10 mg" }] }];
  const ops = {
    products: [{ slug: "bpc-157", shown: true }, { slug: "tb-500", shown: false }],
    variants: [{ slug: "bpc-157", variant_id: "10mg", price_cents: 7900, low_at: 20, threepl_sku: null },
               { slug: "tb-500", variant_id: "10mg", price_cents: 8900, low_at: 20, threepl_sku: null }],
    lots: [
      { id: "1", lot_number: "BPC-1", slug: "bpc-157", variant_id: "10mg", purity_pct: 99.4, method: "HPLC" as const, tested_on: "2026-09-01", coa_path: "a.pdf", status: "live" as const, live_at: "2026-09-02", sellable: 50, held: 0, sold: 40, available: 10, ordered_qty: 50, counted_qty: 50, damaged_qty: 0, adjust_qty: 0, discrepancy_note: null, received_by: null, received_at: "2026-09-02T00:00:00Z", retired_at: null },
      { id: "2", lot_number: "BPC-2", slug: "bpc-157", variant_id: "10mg", purity_pct: 99.1, method: "HPLC" as const, tested_on: "2026-10-01", coa_path: null, status: "draft" as const, live_at: null, sellable: 96, held: 0, sold: 0, available: 96, ordered_qty: 100, counted_qty: 96, damaged_qty: 0, adjust_qty: 0, discrepancy_note: "short 4", received_by: null, received_at: "2026-10-01T00:00:00Z", retired_at: null },
    ],
  };
  it("one row per strength with stock, selling-now and next lot", () => {
    const rows = adminRows(content, ops);
    expect(rows[0]).toMatchObject({ slug: "bpc-157", variantId: "10mg", priceCents: 7900, stock: "low", available: 10, selling: { lotNumber: "BPC-1" }, next: { lotNumber: "BPC-2", status: "draft", discrepancy: true }, shown: true });
    expect(rows[1]).toMatchObject({ slug: "tb-500", stock: "out", shown: false, selling: null });
  });
  it("tabs and counts", () => {
    const rows = adminRows(content, ops);
    expect(tabCounts(rows)).toEqual({ all: 2, low: 1, out: 1, hidden: 1, drafts: 1, discrepancies: 1 });
    expect(rowsForTab(rows, "hidden").map((r) => r.slug)).toEqual(["tb-500"]);
    expect(rowsForTab(rows, "drafts").map((r) => r.slug)).toEqual(["bpc-157"]);
  });
});

describe("lotsMatch / soldOutMessage / coaObjectPath", () => {
  it("same lots and quantities in any order", () => {
    expect(lotsMatch([{ lotNumber: "A", qty: 6 }, { lotNumber: "B", qty: 4 }], [{ lotNumber: "B", qty: 4 }, { lotNumber: "A", qty: 6 }])).toBe(true);
    expect(lotsMatch([{ lotNumber: "A", qty: 6 }, { lotNumber: "B", qty: 4 }], [{ lotNumber: "B", qty: 10 }])).toBe(false);
    expect(lotsMatch([{ lotNumber: "A", qty: 2 }], [])).toBe(false);
  });
  it("names each sold-out strength", () => {
    expect(soldOutMessage([{ name: "MOTS-c", strength: "10 mg" }])).toBe("MOTS-c 10 mg just sold out — we've removed it from your cart.");
    expect(soldOutMessage([{ name: "MOTS-c", strength: "10 mg" }, { name: "KPV", strength: "10 mg" }])).toBe("MOTS-c 10 mg and KPV 10 mg just sold out — we've removed them from your cart.");
  });
  it("certificate path is per lot and unique", () => {
    expect(coaObjectPath("BPC-2610-03", 1759651200000)).toBe("BPC-2610-03/1759651200000.pdf");
    expect(COA_MAX_BYTES).toBe(10 * 1024 * 1024);
  });
});
