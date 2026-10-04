import { describe, it, expect } from "vitest";
import { priceOrder } from "@/lib/pricing";
import { applyCodeDiscount } from "@/lib/partners/discounts";
import { allocate, applyDiscounts, lineEligible } from "@/lib/discounts/engine";
import type { CodeTerms } from "@/lib/discounts/rules";
import type { Compound } from "@/data/catalog";

const lot = { lot: "AP-1", purityPct: 99.5, method: "HPLC" as const, testedOn: "2026-09-01", coaFile: "" };
const packs = [{ qty: 2, pct: 5 }, { qty: 5, pct: 10 }, { qty: 10, pct: 20 }];
const mk = (slug: string, cls: Compound["chemicalClass"], usd: number): Compound => ({
  slug, name: slug.toUpperCase(), chemicalClass: cls, identity: {}, form: "", storage: "", vialMl: 3,
  variants: [{ id: "10mg", strength: "10 mg", priceUsd: usd, stock: "in" }], packDiscounts: packs, currentLot: lot,
});
const list: Compound[] = [mk("bpc-157", "Peptide Fragments", 79), mk("tb-500", "Peptide Fragments", 89), mk("mots-c", "Mitochondrial & Metabolic", 69), mk("blend", "Blends", 99)];
const order = (...l: Array<[string, number, number?]>) => priceOrder(l.map(([slug, packQty, quantity]) => ({ slug, variantId: "10mg", packQty, quantity: quantity ?? 1 })), list);

const spring: CodeTerms = { kind: "order_pct", value: 20, stackOnTop: true, freeShipping: true, minOrderCents: 15000, includeSlugs: [], excludeSlugs: [], includeClasses: [], excludeClasses: ["Blends"] };
const CAP = 30;

describe("allocate", () => {
  it("splits whole cents exactly in proportion", () => {
    expect(allocate(1000, [1, 1, 2])).toEqual([250, 250, 500]);
    expect(allocate(100, [1, 1, 1]).reduce((s, x) => s + x, 0)).toBe(100);
    expect(allocate(50, [0, 0])).toEqual([0, 0]);
  });
});

describe("applyDiscounts — no code", () => {
  it("matches the existing partner/new-account rule exactly", () => {
    const o = order(["bpc-157", 2], ["tb-500", 10]);
    for (const pct of [10, 15]) {
      const legacy = applyCodeDiscount(o, pct);
      const r = applyDiscounts(o, { auto: { pct, newAccount: pct === 15 }, code: null, capPct: CAP });
      expect(r.partnerDiscountCents).toBe(legacy.partnerDiscountCents);
      expect(r.lineDiscounts.map((d) => d.savingCents)).toEqual(legacy.lineDiscounts.map((d) => d.savingCents));
      expect(r.shippingCents).toBe(legacy.shippingCents);
      expect(r.codeOutcome).toBeNull();
    }
  });
});

describe("applyDiscounts — the mock's SPRING20 (20% order, stacks, free ship, $150 min, not Blends)", () => {
  it("10-pack: pack 20% then 20% on top reaches 36%, the 30% cap trims to 30%", () => {
    const r = applyDiscounts(order(["bpc-157", 10]), { auto: null, code: spring, capPct: CAP });
    expect(r.listCents).toBe(79000);
    expect(r.subtotalCents).toBe(63200);
    expect(r.subtotalCents - r.partnerDiscountCents).toBe(55300);
    expect(r.codeGrossCents).toBe(12640);
    expect(r.cappedCents).toBe(4740);
    expect(r.codeDiscountCents).toBe(7900);
    expect(r.codeOutcome).toBe("applied");
  });

  it("2-pack TB-500: 24% off and free shipping", () => {
    const r = applyDiscounts(order(["tb-500", 2]), { auto: null, code: spring, capPct: CAP });
    expect(r.subtotalCents - r.partnerDiscountCents).toBe(13528);
    expect(r.cappedCents).toBe(0);
    expect(r.shippingCents).toBe(0);
    expect(r.codeOutcome).toBe("applied");
  });

  it("below the $150 minimum: not applied, says how much more", () => {
    const r = applyDiscounts(order(["mots-c", 2]), { auto: null, code: spring, capPct: CAP });
    expect(r.codeOutcome).toBe("below_min");
    expect(r.shortOfMinCents).toBe(15000 - 13110);
    expect(r.partnerDiscountCents).toBe(0);
    expect(r.shippingCents).toBe(1500);
  });

  it("only Blends in the cart: no eligible items", () => {
    const r = applyDiscounts(order(["blend", 2]), { auto: null, code: spring, capPct: CAP });
    expect(r.codeOutcome).toBe("no_eligible_items");
  });

  it("excluded lines keep their own discount; the code applies to the rest", () => {
    const r = applyDiscounts(order(["blend", 2], ["bpc-157", 2]), { auto: { pct: 15, newAccount: true }, code: spring, capPct: CAP });
    const [blend, bpc] = r.lineDiscounts;
    expect(blend.source).toBe("auto");
    expect(bpc.source).toBe("code");
    expect(r.newAccount).toBe(true);
  });
});

describe("applyDiscounts — item %", () => {
  const item = (value: number): CodeTerms => ({ ...spring, kind: "item_pct", value, stackOnTop: false, freeShipping: false, minOrderCents: null, excludeClasses: [] });

  it("larger per item wins: a 25% code beats the new-account 15%", () => {
    const r = applyDiscounts(order(["bpc-157", 2]), { auto: { pct: 15, newAccount: true }, code: item(25), capPct: CAP });
    expect(r.lineDiscounts[0].source).toBe("code");
    expect(r.newAccount).toBe(false);
    expect(r.codeOutcome).toBe("applied");
  });

  it("a tie keeps the automatic discount and the code isn't used", () => {
    const r = applyDiscounts(order(["bpc-157", 2]), { auto: { pct: 15, newAccount: true }, code: item(15), capPct: CAP });
    expect(r.codeOutcome).toBe("no_gain");
    expect(r.codeDiscountCents).toBe(0);
    expect(r.newAccount).toBe(true);
  });

  it("a 10-pack's 20% beats a 15% code", () => {
    const r = applyDiscounts(order(["bpc-157", 10]), { auto: null, code: item(15), capPct: CAP });
    expect(r.codeOutcome).toBe("no_gain");
  });
});

describe("applyDiscounts — order code, replace mode", () => {
  const replace = (kind: "order_pct" | "order_amount", value: number): CodeTerms => ({ ...spring, kind, value, stackOnTop: false, freeShipping: false, minOrderCents: null, excludeClasses: [] });

  it("25% off the order beats the 10-pack's 20%", () => {
    const r = applyDiscounts(order(["bpc-157", 10]), { auto: null, code: replace("order_pct", 25), capPct: CAP });
    expect(r.subtotalCents - r.partnerDiscountCents).toBe(59250);
    expect(r.codeDiscountCents).toBe(63200 - 59250);
  });

  it("$10 off doesn't beat a 10-pack's 20%: keeps item discounts, code not used", () => {
    const r = applyDiscounts(order(["bpc-157", 10]), { auto: null, code: replace("order_amount", 1000), capPct: CAP });
    expect(r.codeOutcome).toBe("no_gain");
  });

  it("$ off larger than the goods can't go below zero", () => {
    const r = applyDiscounts(order(["mots-c", 2]), { auto: null, code: { ...replace("order_amount", 999999), stackOnTop: true }, capPct: 60 });
    expect(r.subtotalCents - r.partnerDiscountCents).toBeGreaterThanOrEqual(0);
    expect(r.cappedCents).toBeGreaterThan(0); // the cap stops it at 60%
  });
});

describe("applyDiscounts — order $ stacked across lines", () => {
  it("splits $10 across eligible lines by their price", () => {
    const code: CodeTerms = { ...spring, kind: "order_amount", value: 1000, freeShipping: false, minOrderCents: null, excludeClasses: [] };
    const r = applyDiscounts(order(["bpc-157", 2], ["tb-500", 2]), { auto: null, code, capPct: CAP });
    expect(r.codeDiscountCents).toBe(1000);
    expect(r.lineDiscounts.reduce((s, d) => s + d.savingCents, 0)).toBe(1000);
  });
});

describe("applyDiscounts — free shipping", () => {
  const ship: CodeTerms = { ...spring, kind: "ship_only", value: 0, stackOnTop: false, freeShipping: false, minOrderCents: null, excludeClasses: [] };
  it("ship-only saves the shipping under $300", () => {
    const r = applyDiscounts(order(["bpc-157", 2]), { auto: null, code: ship, capPct: CAP });
    expect(r.codeOutcome).toBe("applied");
    expect(r.shippingCents).toBe(0);
    expect(r.codeDiscountCents).toBe(0);
  });
  it("ship-only over $300 does nothing", () => {
    const r = applyDiscounts(order(["bpc-157", 10]), { auto: null, code: ship, capPct: CAP });
    expect(r.codeOutcome).toBe("no_gain");
  });
});

describe("the cap never raises pack prices", () => {
  it("a 10% cap leaves a 10-pack at its 20% pack price", () => {
    const r = applyDiscounts(order(["bpc-157", 10]), { auto: null, code: null, capPct: 10 });
    expect(r.partnerDiscountCents).toBe(0);
    expect(r.cappedCents).toBe(0);
  });
});

describe("lineEligible", () => {
  it("include lists restrict; exclude lists win", () => {
    const i = { compoundSlug: "bpc-157", chemicalClass: "Peptide Fragments" };
    expect(lineEligible({ ...spring, excludeClasses: [] }, i)).toBe(true);
    expect(lineEligible({ ...spring, excludeClasses: [], includeClasses: ["Blends"] }, i)).toBe(false);
    expect(lineEligible({ ...spring, excludeClasses: [], includeSlugs: ["bpc-157"] }, i)).toBe(true);
    expect(lineEligible({ ...spring, excludeClasses: [], includeSlugs: ["bpc-157"], excludeSlugs: ["bpc-157"] }, i)).toBe(false);
  });
});
