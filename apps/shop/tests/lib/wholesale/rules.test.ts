import { describe, it, expect } from "vitest";
import {
  DEFAULT_TIERS, KIT_VIALS, MAX_KITS_PER_LINE, MIN_KITS_PER_STRENGTH, tierFor, nextTier, kitRows, priceWholesale, cutoffFor, estimatedDates, canCancelWholesale, parseWholesaleSettings,
  featuredKits, kitTitle, parseSettingsForm,
} from "@/lib/wholesale/rules";

// 2026-10-10: minimum 4 kits; 4-9 25%, 10-19 30%, 20+ 35%; at least 2 kits per strength; lot tests absorbed (no fee).
const S = { tiers: DEFAULT_TIERS, depositPct: 40, minKits: 4 };
const settingsRow = { wholesale_open: true, wholesale_tiers: DEFAULT_TIERS, wholesale_deposit_pct: 40, wholesale_balance_days: 7, wholesale_run_days: 14,
  wholesale_lead_days: 28, wholesale_next_cutoff: null, wholesale_min_kits: 4 };

const live = [
  { slug: "bpc-157", name: "BPC-157", chemicalClass: "Peptide", variants: [
    { id: "10mg", strength: "10 mg", priceUsd: 68, wholesale: true },
    { id: "5mg", strength: "5 mg", priceUsd: 42, wholesale: false },
  ] },
  { slug: "tb-500", name: "TB-500", chemicalClass: "Peptide", variants: [{ id: "10mg", strength: "10 mg", priceUsd: 66, wholesale: true }] },
  { slug: "retatrutide", name: "Retatrutide", designation: "APro-G3RT", chemicalClass: "Incretin & Amylin Analogs", variants: [{ id: "10mg", strength: "10 mg", priceUsd: 125, wholesale: true }] },
] as never;

describe("wholesale rules", () => {
  it("tiers: 4-9 25%, 10-19 30%, 20+ 35%; under the minimum prices at the first tier", () => {
    expect([1, 3, 4, 9, 10, 19, 20, 60].map((k) => tierFor(k, DEFAULT_TIERS).pct)).toEqual([25, 25, 25, 25, 30, 30, 35, 35]);
    expect(nextTier(7, DEFAULT_TIERS)).toEqual({ pct: 30, kitsNeeded: 3 });
    expect(nextTier(3, DEFAULT_TIERS)).toEqual({ pct: 30, kitsNeeded: 7 });
    expect(nextTier(25, DEFAULT_TIERS)).toBeNull();
  });

  it("kitRows lists only wholesale-enabled strengths, carrying the APro designation", () => {
    const rows = kitRows(live);
    expect(rows.map((r) => `${r.slug}/${r.variantId}`)).toEqual(["bpc-157/10mg", "tb-500/10mg", "retatrutide/10mg"]);
    expect(rows.map((r) => r.designation)).toEqual([null, null, "APro-G3RT"]);
    expect(kitTitle(rows[2])).toEqual({ title: "APro-G3RT", scientific: "Retatrutide" });
    expect(kitTitle(rows[0])).toEqual({ title: "BPC-157", scientific: null });
  });

  it("prices kits at list x 10 less the tier; deposit = 40% of kits; no lot-test charge", () => {
    const q = priceWholesale([{ slug: "bpc-157", variantId: "10mg", kits: 5 }, { slug: "tb-500", variantId: "10mg", kits: 2 }], kitRows(live), S);
    expect(q.rejected).toEqual([]);
    expect(q.kits).toBe(7);
    expect(q.belowMinimum).toBe(false);
    expect(q.tier.pct).toBe(25);
    expect(q.short).toEqual([]);
    expect(q.items.map((i) => [i.packQty, i.listUnitCents, i.unitPriceCents, i.lineTotalCents])).toEqual([[KIT_VIALS, 68000, 51000, 255000], [KIT_VIALS, 66000, 49500, 99000]]);
    expect(q.subtotalCents).toBe(354000);
    expect(q.shippingCents).toBe(0);           // $300+ ships free
    expect(q.insuranceCents).toBe(550);
    expect(q.depositCents).toBe(141600);           // 40% of kits
    expect(q.totalBeforeTaxCents).toBe(354000 + 550);
    expect(q).not.toHaveProperty("lotFeeCents");
    expect(q.balanceBeforeTaxCents).toBe(354000 - 141600 + 550);
  });

  it("flags an order under the minimum (prices still shown at the first tier)", () => {
    const q = priceWholesale([{ slug: "bpc-157", variantId: "10mg", kits: 3 }], kitRows(live), S);
    expect(q.belowMinimum).toBe(true);
    expect(q.kitsToMinimum).toBe(1);
    expect(q.tier.pct).toBe(25);
    const ok = priceWholesale([{ slug: "bpc-157", variantId: "10mg", kits: 4 }], kitRows(live), S);
    expect([ok.belowMinimum, ok.kitsToMinimum]).toEqual([false, 0]);
  });

  it("flags a strength ordered below the per-strength minimum, even when the order meets the minimum", () => {
    expect(MIN_KITS_PER_STRENGTH).toBe(2);
    const q = priceWholesale([{ slug: "bpc-157", variantId: "10mg", kits: 4 }, { slug: "tb-500", variantId: "10mg", kits: 1 }], kitRows(live), S);
    expect(q.belowMinimum).toBe(false);
    expect(q.short).toEqual([{ slug: "tb-500", variantId: "10mg", kits: 1 }]);
    // duplicate lines merge before the check
    const m = priceWholesale([{ slug: "bpc-157", variantId: "10mg", kits: 2 }, { slug: "tb-500", variantId: "10mg", kits: 1 }, { slug: "tb-500", variantId: "10mg", kits: 1 }], kitRows(live), S);
    expect(m.short).toEqual([]);
  });

  it("rejects unknown, non-wholesale and bad quantities; merges duplicate lines", () => {
    const q = priceWholesale([
      { slug: "bpc-157", variantId: "5mg", kits: 1 }, { slug: "nope", variantId: "1mg", kits: 1 }, { slug: "tb-500", variantId: "10mg", kits: 0 },
    ], kitRows(live), S);
    expect(q.rejected.map((r) => r.reason)).toEqual(["unknown", "unknown", "bad_quantity"]);
    const m = priceWholesale([{ slug: "bpc-157", variantId: "10mg", kits: 6 }, { slug: "bpc-157", variantId: "10mg", kits: 4 }], kitRows(live), S);
    expect(m.items).toHaveLength(1);
    expect(m.kits).toBe(10);
    expect(m.tier.pct).toBe(30);
  });

  it("rejects a merged line over MAX_KITS_PER_LINE and drops it from items", () => {
    expect(MAX_KITS_PER_LINE).toBe(50);
    const q = priceWholesale([
      { slug: "bpc-157", variantId: "10mg", kits: 20 }, { slug: "bpc-157", variantId: "10mg", kits: 20 }, { slug: "bpc-157", variantId: "10mg", kits: 20 },
    ], kitRows(live), S);
    expect(q.rejected.map((r) => r.reason)).toEqual(["bad_quantity"]);
    expect(q.items).toEqual([]);
    expect(q.kits).toBe(0);
  });

  it("cutoff: every other Monday from 2026-10-05, the cutoff day itself still joins", () => {
    expect(cutoffFor("2026-10-05", { runDays: 14, override: null })).toBe("2026-10-05");
    expect(cutoffFor("2026-10-06", { runDays: 14, override: null })).toBe("2026-10-19");
    expect(cutoffFor("2027-01-02", { runDays: 14, override: null })).toBe("2027-01-11");
    expect(cutoffFor("2026-10-06", { runDays: 14, override: "2026-10-23" })).toBe("2026-10-23");
    expect(cutoffFor("2026-10-24", { runDays: 14, override: "2026-10-23" })).toBe("2026-11-02"); // past override ignored
  });

  it("estimated dates: ships cutoff + lead days, tested 5 days before", () => {
    expect(estimatedDates("2026-10-19", 28)).toEqual({ testedAbout: "2026-11-11", shipsAbout: "2026-11-16" });
  });

  it("a buyer can cancel only while deposit_paid and on or before the cutoff", () => {
    expect(canCancelWholesale({ status: "deposit_paid", wholesale_cutoff_on: "2026-10-19" }, "2026-10-19")).toBe(true);
    expect(canCancelWholesale({ status: "deposit_paid", wholesale_cutoff_on: "2026-10-19" }, "2026-10-20")).toBe(false);
    expect(canCancelWholesale({ status: "balance_due", wholesale_cutoff_on: "2026-10-19" }, "2026-10-01")).toBe(false);
  });

  it("parses settings and refuses broken tiers (the first tier starts at the minimum)", () => {
    const s = parseWholesaleSettings(settingsRow);
    expect(s).toMatchObject({ open: true, depositPct: 40, runDays: 14, leadDays: 28, nextCutoffOverride: null, minKits: 4 });
    expect(() => parseWholesaleSettings({ ...settingsRow, wholesale_tiers: [{ minKits: 1, pct: 20 }, { minKits: 10, pct: 25 }] })).toThrow();
    expect(() => parseWholesaleSettings({ ...settingsRow, wholesale_tiers: [{ minKits: 4, pct: 25 }, { minKits: 3, pct: 30 }] })).toThrow();
  });

  it("featured kits: the five on the signed-out page in order; one not offered is replaced by the next kit", () => {
    expect(featuredKits(kitRows(live)).map((r) => r.slug)).toEqual(["bpc-157", "retatrutide", "tb-500"]);
  });
  it("after the cutoff a buyer can still cancel when a strength in their order failed", () => {
    expect(canCancelWholesale({ status: "deposit_paid", wholesale_cutoff_on: "2026-10-19" }, "2026-11-01", { failed: true })).toBe(true);
    expect(canCancelWholesale({ status: "deposit_paid", wholesale_cutoff_on: "2026-10-19" }, "2026-11-01", { failed: false })).toBe(false);
    expect(canCancelWholesale({ status: "balance_due", wholesale_cutoff_on: "2026-10-19" }, "2026-11-01", { failed: true })).toBe(false);
  });

  it("settings form: the first tier starts at the minimum; tiers climb; bounds enforced", () => {
    const form = (o: Record<string, string> = {}) => (k: string) => ({ open: "on", minKits: "5", tierPct0: "20", tierKits1: "10", tierPct1: "25", tierKits2: "20", tierPct2: "30",
      depositPct: "40", balanceDays: "7", runDays: "14", leadDays: "28", nextCutoff: "", ...o } as Record<string, string>)[k] ?? null;
    const ok = parseSettingsForm(form(), "2026-10-09");
    expect(ok).toEqual({ ok: true, value: { open: true, minKits: 5, tiers: [{ minKits: 5, pct: 20 }, { minKits: 10, pct: 25 }, { minKits: 20, pct: 30 }], depositPct: 40, balanceDays: 7, runDays: 14, leadDays: 28, nextCutoff: null } });
    expect(parseSettingsForm(form({ tierKits2: "", tierPct2: "" }), "2026-10-09")).toMatchObject({ ok: true, value: { tiers: [{ minKits: 5, pct: 20 }, { minKits: 10, pct: 25 }] } });
    expect(parseSettingsForm(form({ tierPct1: "15" }), "2026-10-09")).toMatchObject({ ok: false, errors: { tierKits1: expect.any(String) } });
    expect(parseSettingsForm(form({ depositPct: "5" }), "2026-10-09")).toMatchObject({ ok: false, errors: { depositPct: "10% to 90%." } });
    expect(parseSettingsForm(form({ nextCutoff: "2026-10-01" }), "2026-10-09")).toMatchObject({ ok: false, errors: { nextCutoff: "That date has passed." } });
    expect(parseSettingsForm(form({ open: "" }), "2026-10-09")).toMatchObject({ ok: true, value: { open: false } });
  });
});
