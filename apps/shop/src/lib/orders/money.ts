// The order page's Money card. Pure.
import { CODE_DISCOUNT_PCT } from "@/lib/partners/tiers";
import { usd } from "@/lib/html";
import { splitRefund, type RefundDestination } from "@/lib/refunds/rules";

export type MoneyOrder = {
  subtotal_cents: number; partner_discount_cents: number; code_discount_cents: number; shipping_cents: number; insurance_cents: number;
  tax_cents: number; total_cents: number; store_credit_cents: number; new_account_discount: boolean; partner_id: string | null;
  // For the Refunded line (r4). A refund made in the Stripe dashboard has no reason/destination.
  status?: string; refund_reason?: string | null; refund_destination?: RefundDestination | null; stripe_payment_intent?: string | null;
};
export type MoneyCode = { code: string; kind: string; value: number; stack_on_top: boolean; free_shipping: boolean };
export type MoneyLine = { label: string; note?: string; cents: number; kind: "plain" | "disc" | "total" | "charged" | "refund" };

// "5% order, on top" / "$10 off" / "free shipping" — what a discount code does.
export function codeText(c: Pick<MoneyCode, "kind" | "value" | "stack_on_top" | "free_shipping">): string {
  const what = c.kind === "order_pct" ? `${c.value}% order` : c.kind === "item_pct" ? `${c.value}% items` : c.kind === "order_amount" ? `${usd(c.value)} off` : "free shipping";
  return `${what}${c.stack_on_top ? ", on top" : ""}${c.free_shipping ? " + free shipping" : ""}`;
}

// Where a refund made here went: [{ cents, where }] with where = the card
// label ("Visa ••4242", or "card" when none was read) or "store credit".
// Null for a refund made in the Stripe dashboard (nothing stamped).
export function refundParts(o: MoneyOrder, paymentLabel?: string | null): Array<{ cents: number; where: string }> | null {
  if (!o.refund_reason || !o.refund_destination) return null;
  const s = splitRefund({ status: "refunded", kind: "sale", total_cents: o.total_cents, store_credit_cents: o.store_credit_cents, stripe_payment_intent: o.stripe_payment_intent ?? null }, o.refund_destination);
  const credit = s.creditBackCents + s.cardToCreditCents;
  const parts: Array<{ cents: number; where: string }> = [];
  if (s.cardCents > 0) parts.push({ cents: s.cardCents, where: paymentLabel ?? "card" });
  if (credit > 0) parts.push({ cents: credit, where: "store credit" });
  return parts;
}

export function moneyLines(o: MoneyOrder, ctx: { code: MoneyCode | null; partnerCode: string | null; paymentLabel?: string | null }): MoneyLine[] {
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
  if (o.status === "refunded") {
    const parts = refundParts(o, ctx.paymentLabel);
    lines.push({ label: "Refunded", note: parts ? parts.map((p) => `${usd(p.cents)} to ${p.where}`).join(" · ") : "in Stripe", cents: -o.total_cents, kind: "refund" });
  }
  return lines;
}
