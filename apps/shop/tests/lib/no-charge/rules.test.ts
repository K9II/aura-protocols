import { describe, it, expect } from "vitest";
import { NO_CHARGE_REASONS, REASON_LABEL, parseNoCharge, buildLines, summary, NO_CHARGE_NOTE_MAX, NO_CHARGE_MAX_VIALS } from "@/lib/no-charge/rules";

const stock = [
  { slug: "bpc-157", variantId: "10mg", name: "BPC-157", strength: "10 mg", priceCents: 4800, available: 84, hidden: false },
  { slug: "mots-c", variantId: "40mg", name: "MOTS-c", strength: "40 mg", priceCents: 9600, available: 6, hidden: true },
];
const get = (v: Record<string, string | string[]>) => (k: string) => { const x = v[k]; return Array.isArray(x) ? x : x === undefined ? [] : [x]; };

describe("no-charge rules", () => {
  it("reasons in mock order", () => {
    expect(NO_CHARGE_REASONS).toEqual(["seeding", "replacement", "sample", "other"]);
    expect(REASON_LABEL.replacement).toBe("Replacement");
  });
  it("parses a valid replacement", () => {
    const r = parseNoCharge(get({ reason: "replacement", replaces: "AP-1052", note: "2 vials cracked", line: ["bpc-157:10mg:2", "mots-c:40mg:1"], email: "on" }), stock);
    expect(r).toEqual({ ok: true, value: { reason: "replacement", replaces: "AP-1052", note: "2 vials cracked", lines: [{ slug: "bpc-157", variantId: "10mg", vials: 2 }, { slug: "mots-c", variantId: "40mg", vials: 1 }], email: true } });
  });
  it("needs a note for Replacement and Other, and the original order for Replacement", () => {
    const r = parseNoCharge(get({ reason: "replacement", line: "bpc-157:10mg:1" }), stock);
    expect(r).toMatchObject({ ok: false, errors: { note: "Say what happened.", replaces: "Pick the original order." } });
    expect(parseNoCharge(get({ reason: "other", line: "bpc-157:10mg:1" }), stock)).toMatchObject({ ok: false, errors: { note: "Say what the vials are for." } });
    expect(parseNoCharge(get({ reason: "seeding", line: "bpc-157:10mg:1" }), stock)).toMatchObject({ ok: true });
  });
  it("refuses unknown strengths, zero, more than available, duplicates and empty orders", () => {
    expect(parseNoCharge(get({ reason: "seeding", line: "nope:1mg:1" }), stock)).toMatchObject({ ok: false, errors: { lines: "Pick items from the list." } });
    expect(parseNoCharge(get({ reason: "seeding", line: "bpc-157:10mg:0" }), stock)).toMatchObject({ ok: false, errors: { lines: "Each item needs at least 1 vial." } });
    expect(parseNoCharge(get({ reason: "seeding", line: "mots-c:40mg:7" }), stock)).toMatchObject({ ok: false, errors: { lines: "Only 6 vials of MOTS-c 40 mg are available." } });
    expect(parseNoCharge(get({ reason: "seeding", line: ["bpc-157:10mg:1", "bpc-157:10mg:2"] }), stock)).toMatchObject({ ok: false, errors: { lines: "BPC-157 10 mg is listed twice." } });
    expect(parseNoCharge(get({ reason: "seeding" }), stock)).toMatchObject({ ok: false, errors: { lines: "Add at least one item." } });
    expect(parseNoCharge(get({ reason: "bogus", line: "bpc-157:10mg:1" }), stock)).toMatchObject({ ok: false, errors: { reason: "Pick a reason." } });
    expect(parseNoCharge(get({ reason: "seeding", line: `bpc-157:10mg:${NO_CHARGE_MAX_VIALS + 1}` }), [{ ...stock[0], available: 999 }])).toMatchObject({ ok: false });
    expect(parseNoCharge(get({ reason: "other", note: "x".repeat(NO_CHARGE_NOTE_MAX + 1), line: "bpc-157:10mg:1" }), stock)).toMatchObject({ ok: false, errors: { note: `Keep it under ${NO_CHARGE_NOTE_MAX} characters.` } });
  });
  it("builds zero-price lines that keep the retail price, and a summary", () => {
    const lines = buildLines([{ slug: "bpc-157", variantId: "10mg", vials: 2 }, { slug: "mots-c", variantId: "40mg", vials: 1 }], stock);
    expect(lines[0]).toEqual({ compoundSlug: "bpc-157", compoundName: "BPC-157", variantId: "10mg", strength: "10 mg", packQty: 1, quantity: 2, unitPriceCents: 0, lineTotalCents: 0, retailUnitCents: 4800 });
    expect(summary(lines)).toEqual({ vials: 3, retailCents: 19200 });
  });
});
