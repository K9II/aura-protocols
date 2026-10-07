// The order page's Money card. Pure.
import { CODE_DISCOUNT_PCT } from "@/lib/partners/tiers";
import { usd } from "@/lib/html";

export type MoneyOrder = {
  subtotal_cents: number; partner_discount_cents: number; code_discount_cents: number; shipping_cents: number; insurance_cents: number;
  tax_cents: number; total_cents: number; store_credit_cents: number; new_account_discount: boolean; partner_id: string | null;
};
export type MoneyCode = { code: string; kind: string; value: number; stack_on_top: boolean; free_shipping: boolean };
export type MoneyLine = { label: string; note?: string; cents: number; kind: "plain" | "disc" | "total" | "charged" };

// "5% order, on top" / "$10 off" / "free shipping" — what a discount code does.
export function codeText(c: Pick<MoneyCode, "kind" | "value" | "stack_on_top" | "free_shipping">): string {
  const what = c.kind === "order_pct" ? `${c.value}% order` : c.kind === "item_pct" ? `${c.value}% items` : c.kind === "order_amount" ? `${usd(c.value)} off` : "free shipping";
  return `${what}${c.stack_on_top ? ", on top" : ""}${c.free_shipping ? " + free shipping" : ""}`;
}

export function moneyLines(o: MoneyOrder, ctx: { code: MoneyCode | null; partnerCode: string | null }): MoneyLine[] {
  const other = o.partner_discount_cents - o.code_discount_cents;
  const lines: MoneyLine[] = [{ label: "Goods", cents: o.subtotal_cents, kind: "plain" }];
  if (other > 0) {
    if (o.new_account_discount) lines.push({ label: "New-account offer", cents: -other, kind: "disc" });
    else if (o.partner_id) lines.push({ label: "Partner discount", note: ctx.partnerCode ? `${ctx.partnerCode} · ${CODE_DISCOUNT_PCT}%` : undefined, cents: -other, kind: "disc" });
    else lines.push({ label: "Discount", cents: -other, kind: "disc" });
  }
  if (o.code_discount_cents > 0) lines.push({ label: "Code", note: ctx.code ? `${ctx.code.code} · ${codeText(ctx.code)}` : undefined, cents: -o.code_discount_cents, kind: "disc" });
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
