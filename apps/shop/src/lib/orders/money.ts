// The order page's Money card. Pure.
export type MoneyOrder = {
  subtotal_cents: number; partner_discount_cents: number; code_discount_cents: number; shipping_cents: number; insurance_cents: number;
  tax_cents: number; total_cents: number; store_credit_cents: number; new_account_discount: boolean; partner_id: string | null;
};
export type MoneyLine = { label: string; note?: string; cents: number; kind: "plain" | "disc" | "total" | "charged" };

export function moneyLines(o: MoneyOrder, ctx: { code: string | null; partnerCode: string | null }): MoneyLine[] {
  const other = o.partner_discount_cents - o.code_discount_cents;
  const lines: MoneyLine[] = [{ label: "Goods", cents: o.subtotal_cents, kind: "plain" }];
  if (other > 0) {
    if (o.new_account_discount) lines.push({ label: "New-account offer", cents: -other, kind: "disc" });
    else if (o.partner_id) lines.push({ label: "Partner discount", note: ctx.partnerCode ?? undefined, cents: -other, kind: "disc" });
    else lines.push({ label: "Discount", cents: -other, kind: "disc" });
  }
  if (o.code_discount_cents > 0) lines.push({ label: "Code", note: ctx.code ?? undefined, cents: -o.code_discount_cents, kind: "disc" });
  lines.push(
    { label: "Shipping", cents: o.shipping_cents, kind: "plain" },
    { label: "Insurance", cents: o.insurance_cents, kind: "plain" },
    { label: "Tax", cents: o.tax_cents, kind: "plain" },
    { label: "Total", cents: o.total_cents, kind: "total" },
    { label: "Store credit applied", cents: o.store_credit_cents, kind: "plain" },
    { label: "Charged", cents: o.total_cents - o.store_credit_cents, kind: "charged" },
  );
  return lines;
}
