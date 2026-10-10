import { describe, it, expect } from "vitest";
import { profitView, toProfitRow, type ProfitRow } from "@/lib/profit/rules";

const row = (o: Partial<ProfitRow> = {}): ProfitRow => ({
  goodsCents: 194400, productCents: 41600, freightCents: 7500, labelCents: 2000, testCents: 9800, packagingCents: 0, feeCents: 9500, feeEstimated: false, commissionCents: 0, vials: 50, vialsCosted: 50, ...o,
});

describe("profitView", () => {
  it("goods minus product cost, lab share, card fees and commission, with the margin", () => {
    const v = profitView(row({ commissionCents: 1000 }));
    expect(v.profitCents).toBe(194400 - 41600 - 7500 - 2000 - 9800 - 9500 - 1000);
    expect(v.marginPct).toBe(63);
    expect(v.lines.map((l) => [l.label, l.cents])).toEqual([
      ["Goods (after discounts)", 194400], ["Landed cost", -51100],
      ["Lab test share", -9800], ["Card fees", -9500], ["Partner commission", -1000],
    ]);
    expect(v.lines[1].note).toBe("50 vials: supplier $416.00 + shipping & customs $75.00 + labels $20.00");
    expect(v.warnings).toEqual([]);
  });
  it("a wholesale order's kit boxes get their own line; retail shows none", () => {
    const v = profitView(row({ packagingCents: 2250 }));
    expect(v.lines.find((l) => l.label === "Kit boxes")?.cents).toBe(-2250);
    expect(v.profitCents).toBe(194400 - 41600 - 7500 - 2000 - 9800 - 2250 - 9500);
    expect(profitView(row()).lines.some((l) => l.label === "Kit boxes")).toBe(false);
  });
  it("says when the card fee is an estimate", () => {
    expect(profitView(row({ feeEstimated: true })).lines.find((l) => l.label === "Card fees")?.note).toMatch(/estimated/);
  });
  it("warns when some vials came from lots without a recorded cost, or none are allocated", () => {
    expect(profitView(row({ vialsCosted: 40 })).warnings[0]).toMatch(/^10 vials came from lots with no cost recorded/);
    expect(profitView(row({ vials: 0, vialsCosted: 0, productCents: 0 })).warnings[0]).toMatch(/No vials are allocated/);
  });
  it("no margin without goods", () => {
    expect(profitView(row({ goodsCents: 0 })).marginPct).toBeNull();
  });
});

describe("toProfitRow", () => {
  it("reads the database row (bigints may arrive as strings)", () => {
    expect(toProfitRow({ goods_cents: "1000", product_cents: 200, freight_cents: "30", label_cents: 4, test_cents: "50", packaging_cents: "450", fee_cents: 59, fee_estimated: true, commission_cents: "0", vials: "10", vials_costed: 10 }))
      .toEqual({ goodsCents: 1000, productCents: 200, freightCents: 30, labelCents: 4, testCents: 50, packagingCents: 450, feeCents: 59, feeEstimated: true, commissionCents: 0, vials: 10, vialsCosted: 10 });
  });
  it("a zero cost is 0, not -0", () => {
    expect(Object.is(profitView(row({ commissionCents: 0 })).lines[4].cents, 0)).toBe(true);
  });
});
