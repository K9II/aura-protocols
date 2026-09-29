import { describe, it, expect } from "vitest";
import type { Compound } from "@/data/catalog";
import {
  addLine, removeLine, setQuantity, linePriceUsd, cartTotals, packPct,
  FREE_SHIPPING_THRESHOLD_USD, FLAT_SHIPPING_USD, SHIPPING_INSURANCE_USD, formatUsd, type CartLine,
} from "@/lib/cart";

const c: Compound = {
  slug: "a", name: "Alpha", chemicalClass: "Peptide Fragments", identity: {},
  form: "x", storage: "x", vialMl: 3,
  variants: [{ id: "5mg", strength: "5 mg", priceUsd: 50, stock: "in" }],
  packDiscounts: [{ qty: 1, pct: 0 }, { qty: 3, pct: 10 }, { qty: 10, pct: 20 }],
  currentLot: { pending: true },
};
const list = [c];
const line = (over: Partial<CartLine> = {}): CartLine => ({ slug: "a", variantId: "5mg", packQty: 1, quantity: 1, ...over });

describe("cart", () => {
  it("looks up the pack discount, 0 for unknown packs", () => {
    expect(packPct(c, 3)).toBe(10);
    expect(packPct(c, 7)).toBe(0);
  });

  it("prices a line: unit × pack × (1 − discount) × quantity, to the cent", () => {
    expect(linePriceUsd(line(), list)).toBe(50);
    expect(linePriceUsd(line({ packQty: 3 }), list)).toBe(135);
    expect(linePriceUsd(line({ packQty: 10, quantity: 2 }), list)).toBe(800);
  });

  it("prices an unknown compound or variant at 0", () => {
    expect(linePriceUsd(line({ slug: "zzz" }), list)).toBe(0);
    expect(linePriceUsd(line({ variantId: "zzz" }), list)).toBe(0);
  });

  it("merges identical lines when adding", () => {
    const lines = addLine(addLine([], line()), line({ quantity: 2 }));
    expect(lines).toEqual([line({ quantity: 3 })]);
  });

  it("keeps different packs as separate lines", () => {
    expect(addLine([line()], line({ packQty: 3 }))).toHaveLength(2);
  });

  it("removes and re-quantifies lines; quantity 0 removes", () => {
    const lines = [line(), line({ packQty: 3 })];
    expect(removeLine(lines, 0)).toEqual([line({ packQty: 3 })]);
    expect(setQuantity(lines, 1, 4)[1].quantity).toBe(4);
    expect(setQuantity(lines, 1, 0)).toEqual([line()]);
  });

  it("totals the cart and tracks the free-shipping threshold", () => {
    const t = cartTotals([line({ packQty: 3 })], list);
    expect(t.subtotalUsd).toBe(135);
    expect(t.itemCount).toBe(1);
    expect(t.freeShipping).toBe(false);
    expect(t.remainingForFreeShippingUsd).toBe(FREE_SHIPPING_THRESHOLD_USD - 135);
    expect(cartTotals([line({ packQty: 10 })], list).freeShipping).toBe(true);
  });
});

describe("shipping constants", () => {
  it("matches the approved shipping economics", () => {
    expect(FREE_SHIPPING_THRESHOLD_USD).toBe(250);
    expect(FLAT_SHIPPING_USD).toBe(15);
    expect(SHIPPING_INSURANCE_USD).toBe(5.5);
  });

  it("formats whole dollars without cents and fractional amounts with two decimals", () => {
    expect(formatUsd(250)).toBe("$250");
    expect(formatUsd(15)).toBe("$15");
    expect(formatUsd(5.5)).toBe("$5.50");
  });
});
