import { describe, it, expect } from "vitest";
import {
  DEFAULT_TIERS, KIT_VIALS, tierFor, nextTier, kitRows, priceWholesale, cutoffFor, estimatedDates, canCancelWholesale, parseWholesaleSettings,
} from "@/lib/wholesale/rules";

const live = [
  { slug: "bpc-157", name: "BPC-157", chemicalClass: "Peptide", variants: [
    { id: "10mg", strength: "10 mg", priceUsd: 68, wholesale: true },
    { id: "5mg", strength: "5 mg", priceUsd: 42, wholesale: false },
  ] },
  { slug: "tb-500", name: "TB-500", chemicalClass: "Peptide", variants: [{ id: "10mg", strength: "10 mg", priceUsd: 66, wholesale: true }] },
] as never;

describe("wholesale rules", () => {
  it("tiers: 1-4 25%, 5-9 30%, 10+ 35%", () => {
    expect([1, 4, 5, 9, 10, 40].map((k) => tierFor(k, DEFAULT_TIERS).pct)).toEqual([25, 25, 30, 30, 35, 35]);
    expect(nextTier(3, DEFAULT_TIERS)).toEqual({ pct: 30, kitsNeeded: 2 });
    expect(nextTier(12, DEFAULT_TIERS)).toBeNull();
  });

  it("kitRows lists only wholesale-enabled strengths", () => {
    expect(kitRows(live).map((r) => `${r.slug}/${r.variantId}`)).toEqual(["bpc-157/10mg", "tb-500/10mg"]);
  });

  it("prices kits at list x 10 less the tier, with deposit and balance", () => {
    const q = priceWholesale([{ slug: "bpc-157", variantId: "10mg", kits: 2 }, { slug: "tb-500", variantId: "10mg", kits: 1 }], kitRows(live), { tiers: DEFAULT_TIERS, depositPct: 40 });
    expect(q.rejected).toEqual([]);
    expect(q.kits).toBe(3);
    expect(q.tier.pct).toBe(25);
    expect(q.items.map((i) => [i.packQty, i.listUnitCents, i.unitPriceCents, i.lineTotalCents])).toEqual([[KIT_VIALS, 68000, 51000, 102000], [KIT_VIALS, 66000, 49500, 49500]]);
    expect(q.subtotalCents).toBe(151500);
    expect(q.shippingCents).toBe(0);           // $300+ ships free
    expect(q.insuranceCents).toBe(550);
    expect(q.depositCents).toBe(60600);         // 40% of goods
    expect(q.balanceBeforeTaxCents).toBe(151500 - 60600 + 550);
  });

  it("rejects unknown, non-wholesale and bad quantities; merges duplicate lines", () => {
    const q = priceWholesale([
      { slug: "bpc-157", variantId: "5mg", kits: 1 }, { slug: "nope", variantId: "1mg", kits: 1 }, { slug: "tb-500", variantId: "10mg", kits: 0 },
    ], kitRows(live), { tiers: DEFAULT_TIERS, depositPct: 40 });
    expect(q.rejected.map((r) => r.reason)).toEqual(["unknown", "unknown", "bad_quantity"]);
    const m = priceWholesale([{ slug: "bpc-157", variantId: "10mg", kits: 2 }, { slug: "bpc-157", variantId: "10mg", kits: 3 }], kitRows(live), { tiers: DEFAULT_TIERS, depositPct: 40 });
    expect(m.items).toHaveLength(1);
    expect(m.kits).toBe(5);
    expect(m.tier.pct).toBe(30);
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

  it("parses settings and refuses broken tiers", () => {
    const s = parseWholesaleSettings({ wholesale_open: true, wholesale_tiers: DEFAULT_TIERS, wholesale_deposit_pct: 40, wholesale_balance_days: 7, wholesale_run_days: 14, wholesale_lead_days: 28, wholesale_next_cutoff: null });
    expect(s).toMatchObject({ open: true, depositPct: 40, runDays: 14, leadDays: 28, nextCutoffOverride: null });
    expect(() => parseWholesaleSettings({ wholesale_open: true, wholesale_tiers: [{ minKits: 5, pct: 30 }], wholesale_deposit_pct: 40, wholesale_balance_days: 7, wholesale_run_days: 14, wholesale_lead_days: 28, wholesale_next_cutoff: null })).toThrow();
  });
});
