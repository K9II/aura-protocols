import type { Compound } from "@/data/catalog";

// Shipping economics — the policy pages, cart and checkout all read these.
export const FREE_SHIPPING_THRESHOLD_USD = 300;
export const FLAT_SHIPPING_USD = 15;
export const SHIPPING_INSURANCE_USD = 5.5; // charged on every order; covers transit loss/damage (replacement only)

export function formatUsd(amount: number): string {
  return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
}

export type CartLine = {
  slug: string;
  variantId: string;
  packQty: number;   // vials per pack (2, 5, 10)
  quantity: number;  // number of packs
};

const cents = (n: number) => Math.round(n * 100) / 100;
const sameItem = (a: CartLine, b: CartLine) =>
  a.slug === b.slug && a.variantId === b.variantId && a.packQty === b.packQty;

export function packPct(c: Compound, packQty: number): number {
  return c.packDiscounts.find((p) => p.qty === packQty)?.pct ?? 0;
}

export function linePriceUsd(line: CartLine, list: Compound[]): number {
  const c = list.find((x) => x.slug === line.slug);
  const v = c?.variants.find((x) => x.id === line.variantId);
  if (!c || !v) return 0;
  return cents(v.priceUsd * line.packQty * (1 - packPct(c, line.packQty) / 100) * line.quantity);
}

export function addLine(lines: CartLine[], add: CartLine): CartLine[] {
  const i = lines.findIndex((l) => sameItem(l, add));
  if (i === -1) return [...lines, add];
  return lines.map((l, j) => (j === i ? { ...l, quantity: l.quantity + add.quantity } : l));
}

export function removeLine(lines: CartLine[], index: number): CartLine[] {
  return lines.filter((_, j) => j !== index);
}

export function setQuantity(lines: CartLine[], index: number, quantity: number): CartLine[] {
  if (quantity <= 0) return removeLine(lines, index);
  return lines.map((l, j) => (j === index ? { ...l, quantity } : l));
}

export function cartTotals(lines: CartLine[], list: Compound[]) {
  const subtotalUsd = cents(lines.reduce((sum, l) => sum + linePriceUsd(l, list), 0));
  return {
    subtotalUsd,
    itemCount: lines.reduce((n, l) => n + l.quantity, 0),
    freeShipping: subtotalUsd >= FREE_SHIPPING_THRESHOLD_USD,
    remainingForFreeShippingUsd: Math.max(0, cents(FREE_SHIPPING_THRESHOLD_USD - subtotalUsd)),
  };
}
