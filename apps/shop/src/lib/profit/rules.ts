// Real profit of an order (lot-costs.sql order_profit_rows). Pure.

export type ProfitRow = {
  goodsCents: number; productCents: number; testCents: number; feeCents: number; feeEstimated: boolean;
  commissionCents: number; vials: number; vialsCosted: number;
};

export type ProfitView = {
  lines: Array<{ label: string; cents: number; note?: string }>;
  profitCents: number; marginPct: number | null;
  warnings: string[];
};

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

// Goods (after discounts) minus product cost, lab test share, card fees and
// partner commission. Shipping labels and 3PL fees aren't known to the store
// yet, so they're not in it (the card says so).
export function profitView(r: ProfitRow): ProfitView {
  const profitCents = r.goodsCents - r.productCents - r.testCents - r.feeCents - r.commissionCents;
  const uncosted = r.vials - r.vialsCosted;
  const warnings: string[] = [];
  if (r.vials === 0) warnings.push("No vials are allocated to this order yet, so product cost is $0.");
  else if (uncosted > 0) warnings.push(`${plural(uncosted, "vial")} came from lots with no cost recorded, so profit is overstated. Record the cost on the lot (Catalog).`);
  return {
    lines: [
      { label: "Goods (after discounts)", cents: r.goodsCents },
      { label: "Product cost", cents: -r.productCents, note: `${plural(r.vials, "vial")} at each lot's cost per vial` },
      { label: "Lab test share", cents: -r.testCents },
      { label: "Card fees", cents: -r.feeCents, note: r.feeEstimated ? "estimated · 2.9% + 30¢" : undefined },
      { label: "Partner commission", cents: -r.commissionCents },
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
    goodsCents: n(d.goods_cents), productCents: n(d.product_cents), testCents: n(d.test_cents), feeCents: n(d.fee_cents),
    feeEstimated: !!d.fee_estimated, commissionCents: n(d.commission_cents), vials: n(d.vials), vialsCosted: n(d.vials_costed),
  };
}
