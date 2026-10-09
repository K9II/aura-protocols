// Real profit of an order (lot-costs.sql order_profit_rows). Pure.

export type ProfitRow = {
  goodsCents: number; productCents: number; freightCents: number; labelCents: number; testCents: number; packagingCents: number; feeCents: number; feeEstimated: boolean;
  commissionCents: number; vials: number; vialsCosted: number;
};

export type ProfitView = {
  lines: Array<{ label: string; cents: number; note?: string }>;
  profitCents: number; marginPct: number | null;
  warnings: string[];
};

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
// A cost as a negative line; 0 stays 0 (not -0, which prints as "$-0.00").
const less = (c: number) => (c ? -c : 0);

// Goods (after discounts) minus product cost, lab test share, card fees and
// partner commission. Shipping labels and 3PL fees aren't known to the store
// yet, so they're not in it (the card says so).
export function profitView(r: ProfitRow): ProfitView {
  const profitCents = r.goodsCents - r.productCents - r.freightCents - r.labelCents - r.testCents - r.packagingCents - r.feeCents - r.commissionCents;
  const uncosted = r.vials - r.vialsCosted;
  const warnings: string[] = [];
  if (r.vials === 0) warnings.push("No vials are allocated to this order yet, so product cost is $0.");
  else if (uncosted > 0) warnings.push(`${plural(uncosted, "vial")} came from lots with no cost recorded, so profit is overstated. Record the cost on the lot (Catalog).`);
  return {
    lines: [
      { label: "Goods (after discounts)", cents: r.goodsCents },
      { label: "Supplier cost", cents: less(r.productCents), note: `${plural(r.vials, "vial")} at each lot's cost per vial` },
      { label: "Shipping & customs in", cents: less(r.freightCents) },
      { label: "Labels", cents: less(r.labelCents) },
      { label: "Lab test share", cents: less(r.testCents) },
      // wholesale only: the branded kit boxes recorded on the order
      ...(r.packagingCents > 0 ? [{ label: "Kit boxes", cents: less(r.packagingCents) }] : []),
      { label: "Card fees", cents: less(r.feeCents), note: r.feeEstimated ? "estimated · 2.9% + 30¢" : undefined },
      { label: "Partner commission", cents: less(r.commissionCents) },
    ],
    profitCents,
    marginPct: r.goodsCents > 0 ? Math.round((profitCents / r.goodsCents) * 100) : null,
    warnings,
  };
}

// The database row (snake case, bigint as string or number) → ProfitRow.
export function toProfitRow(d: Record<string, unknown>): ProfitRow {
  const n = (v: unknown) => Number(v ?? 0);
  return {
    goodsCents: n(d.goods_cents), productCents: n(d.product_cents), freightCents: n(d.freight_cents), labelCents: n(d.label_cents), testCents: n(d.test_cents), packagingCents: n(d.packaging_cents), feeCents: n(d.fee_cents),
    feeEstimated: !!d.fee_estimated, commissionCents: n(d.commission_cents), vials: n(d.vials), vialsCosted: n(d.vials_costed),
  };
}
