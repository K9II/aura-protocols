import { describe, it, expect } from "vitest";
import { profitView, toProfitRow, type ProfitRow } from "@/lib/profit/rules";

const row = (o: Partial<ProfitRow> = {}): ProfitRow => ({
  goodsCents: 194400, productCents: 41600, testCents: 9800, feeCents: 9500, feeEstimated: false, commissionCents: 0, vials: 50, vialsCosted: 50, ...o,
});

describe("profitView", () => {
  it("goods minus product cost, lab share, card fees and commission, with the margin", () => {
    const v = profitView(row({ commissionCents: 1000 }));
    expect(v.profitCents).toBe(194400 - 41600 - 9800 - 9500 - 1000);
    expect(v.marginPct).toBe(68);
    expect(v.lines.map((l) => [l.label, l.cents])).toEqual([
      ["Goods (after discounts)", 194400], ["Product cost", -41600], ["Lab test share", -9800], ["Card fees", -9500], ["Partner commission", -1000],
    ]);
    expect(v.warnings).toEqual([]);
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
    expect(toProfitRow({ goods_cents: "1000", product_cents: 200, test_cents: "50", fee_cents: 59, fee_estimated: true, commission_cents: "0", vials: "10", vials_costed: 10 }))
      .toEqual({ goodsCents: 1000, productCents: 200, testCents: 50, feeCents: 59, feeEstimated: true, commissionCents: 0, vials: 10, vialsCosted: 10 });
  });
  it("a zero cost is 0, not -0", () => {
    expect(Object.is(profitView(row({ commissionCents: 0 })).lines[4].cents, 0)).toBe(true);
  });
});
