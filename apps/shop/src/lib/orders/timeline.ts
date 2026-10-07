// The order page's Timeline, built at read time from records that already
// exist (no order-events table). Pure. Newest first.
import { trackingUrl } from "@/lib/emails";
import { shortDate } from "@/lib/discounts/time";
import { usd } from "@/lib/html";
import { CLEARING_DAYS } from "@/lib/partners/tiers";
import type { CommissionState } from "@/lib/partners/ledger";

export type TimelineEntry = { key: string; at: string; tone: "ok" | "red" | "plain"; title: string; detail?: string; who?: string | null; href?: string; hrefLabel?: string };
export type TimelineSources = {
  order: {
    id: string; created_at: string; paid_at: string | null; shipped_at: string | null; cancelled_at: string | null; refunded_at: string | null;
    carrier: string | null; tracking_number: string | null; stripe_payment_intent: string | null; store_credit_cents: number; total_cents: number;
  };
  adminEvents: Array<{ action: string; at: string; actorName: string | null; detail: string | null }>;
  commission: { amount_cents: number; rate_pct: number; state: CommissionState; created_at: string; clears_at: string | null; voided_at: string | null; partnerCode: string } | null;
  disputes: Array<{ id: string; status: string; reason: string; amount_cents: number; opened_at: string; closed_at: string | null; outcome: string | null }>;
  warnings: Array<{ id: string; fraud_type: string; created_at: string; resolved_action: string | null; resolved_at: string | null; resolverName: string | null }>;
  inquiries: Array<{ ref: number; subject: string; status: string; created_at: string }>;
};

const words = (s: string) => s.replace(/_/g, " ");
const INQUIRY_STATUS: Record<string, string> = { new: "New", needs_reply: "Needs reply", waiting: "Waiting on customer", closed: "Closed" };
const RESOLVED: Record<string, string> = { refunded: "cancelled and refunded", watching: "marked watching", disputed: "became a chargeback", closed: "closed" };

export function buildOrderTimeline(s: TimelineSources): TimelineEntry[] {
  const o = s.order;
  const ev = (action: string) => s.adminEvents.find((e) => e.action === action);
  const out: TimelineEntry[] = [{ key: "placed", at: o.created_at, tone: "plain", title: "Placed", detail: "checkout started · research use confirmed" }];
  if (o.paid_at) out.push({ key: "paid", at: o.paid_at, tone: "ok", title: "Paid", detail: o.stripe_payment_intent ? "Stripe payment" : "paid in store credit" });
  if (s.commission) {
    const c = s.commission;
    out.push({ key: "commission", at: c.created_at, tone: "plain", title: `Commission created · ${c.partnerCode} · ${usd(c.amount_cents)} (${c.rate_pct}%)`, detail: c.clears_at ? `clears ${shortDate(c.clears_at)}` : `clears ${CLEARING_DAYS} days after shipping` });
    if (c.voided_at) out.push({ key: "commission-void", at: c.voided_at, tone: "plain", title: `Commission voided · ${c.partnerCode}` });
  }
  if (o.shipped_at) {
    const e = ev("order_shipped");
    const carrier = (o.carrier ?? "").toUpperCase();
    out.push({ key: "shipped", at: o.shipped_at, tone: "ok", title: `Shipped · ${carrier} ${o.tracking_number ?? ""}`.trim(), who: e?.actorName ?? null, href: o.tracking_number ? trackingUrl(o.carrier ?? "usps", o.tracking_number) : undefined });
  }
  if (o.cancelled_at) out.push({ key: "cancelled", at: o.cancelled_at, tone: "plain", title: "Cancelled", detail: "checkout closed · no money moved" });
  if (o.refunded_at) {
    const e = ev("order_refunded");
    out.push({ key: "refunded", at: o.refunded_at, tone: "red", title: "Refunded", detail: e ? e.detail ?? undefined : "in Stripe", who: e?.actorName ?? null });
  }
  for (const d of s.disputes) {
    out.push({ key: `dispute-${d.id}`, at: d.opened_at, tone: "red", title: `Chargeback opened · ${words(d.reason)} · ${usd(d.amount_cents)}`, href: `/admin/disputes/${d.id}`, hrefLabel: "Open dispute" });
    if (d.closed_at) out.push({ key: `dispute-${d.id}-closed`, at: d.closed_at, tone: d.outcome === "won" ? "ok" : "red", title: `Chargeback closed · ${words(d.outcome ?? d.status)}`, href: `/admin/disputes/${d.id}`, hrefLabel: "Open dispute" });
  }
  for (const w of s.warnings) {
    out.push({ key: `warning-${w.id}`, at: w.created_at, tone: "red", title: `Early fraud warning · ${words(w.fraud_type)}`, href: "/admin/disputes", hrefLabel: "Disputes" });
    if (w.resolved_at && w.resolved_action) out.push({ key: `warning-${w.id}-resolved`, at: w.resolved_at, tone: "plain", title: `Warning ${RESOLVED[w.resolved_action] ?? w.resolved_action}`, who: w.resolverName });
  }
  for (const i of s.inquiries) {
    out.push({ key: `inquiry-${i.ref}`, at: i.created_at, tone: "plain", title: `Customer wrote in — ${i.subject}`, detail: INQUIRY_STATUS[i.status] ?? i.status, href: `/admin/inquiries/Q-${i.ref}`, hrefLabel: `Q-${i.ref}` });
  }
  // Newest first; equal times keep the order they were added in (stable sort).
  return out.map((e, i) => ({ e, i })).sort((a, b) => b.e.at.localeCompare(a.e.at) || b.i - a.i).map((x) => x.e);
}
