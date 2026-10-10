import { describe, it, expect } from "vitest";
import { vipExample } from "@/components/admin/guide/example";

describe("Guide worked example (VIP-OCT, 25% off items)", () => {
  it("at a 35% maximum: the code wins on both lines, no trim, free shipping", () => {
    const ex = vipExample(35);
    expect(ex.lines.map((l) => [l.listCents, l.withoutCents, l.withCents])).toEqual([[12_000, 12_000, 9_000], [50_000, 40_000, 37_500]]);
    expect(ex).toMatchObject({ listCents: 62_000, withoutCents: 52_000, goodsCents: 46_500, offPct: 25, capped: false, freeShipping: true });
  });

  it("at a 20% maximum the checkout trims it", () => {
    const ex = vipExample(20);
    expect(ex.capped).toBe(true);
    expect(ex.goodsCents).toBe(49_600); // 62,000 list − 20% = 49,600
    expect(ex.lines.reduce((s, l) => s + l.withCents, 0)).toBe(49_600);
  });

  it("never prices an item above its pack price (15% maximum)", () => {
    const ex = vipExample(15);
    expect(ex.goodsCents).toBe(52_000);
    ex.lines.forEach((l) => expect(l.withCents).toBeLessThanOrEqual(l.withoutCents));
  });
});
