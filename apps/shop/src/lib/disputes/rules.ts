// Disputes module rules (spec 2026-10-05-admin-disputes-design.md). Pure —
// safe in client components (no scanner, no server imports).
import { dateTime, mountainDaysUntil, shortDate } from "@/lib/discounts/time";
import { usd } from "@/lib/html";
import type { OrderStatus } from "@/lib/order-status";
import type { EvidenceDraft } from "@/lib/disputes/fields";
import { plural } from "@/lib/disputes/format";
import { CLOCK_DRIFT_MS, DISPUTE_DUE_SOON_DAYS, DISPUTE_RATE_REVIEW_PCT, DISPUTE_REMIND_DAYS, DISPUTE_WON_DAYS } from "@/lib/disputes/constants";

const DAY = 86_400_000;

// Stripe dispute statuses. "warning_*" are inquiries (respond the same way).
export const OPEN_STATUSES = ["needs_response", "warning_needs_response"] as const;
const REVIEW_STATUSES = ["under_review", "warning_under_review"];
export const CLOSED_STATUSES = ["won", "lost", "warning_closed", "prevented"] as const;

export type OrderBrief = {
  number: string; status: OrderStatus; email: string; customerId: string; customerName: string;
  shippedAt: string | null; paidAt: string | null; totalCents: number; creditCents: number;
};
export type DisputeRow = {
  id: string; stripe_dispute_id: string; order_id: string; charge_id: string; payment_intent_id: string | null;
  amount_cents: number; currency: string; reason: string; status: string; evidence_due_by: string | null;
  evidence_submitted: boolean; fee_cents: number; card_brand: string | null; card_last4: string | null; billing_address: string | null;
  draft: EvidenceDraft | null; draft_saved_at: string | null; evidence_files: Record<string, string>; evidence_file_sha: string | null;
  submitted_at: string | null; submitted_by: string | null; outcome: string | null; closed_at: string | null;
  funds_withdrawn_at: string | null; funds_reinstated_at: string | null; reminded: Record<string, string>;
  opened_at: string; last_event_at: string; created_at: string; updated_at: string;
};
export type DisputeListRow = DisputeRow & { order: OrderBrief };
export type WarningAction = "refunded" | "watching" | "disputed" | "closed";
export type WarningRow = {
  id: string; stripe_efw_id: string; order_id: string; charge_id: string; fraud_type: string; actionable: boolean;
  created_at: string; resolved_action: WarningAction | null; resolved_at: string | null; resolved_by: string | null;
};
export type WarningListRow = WarningRow & { order: OrderBrief; resolvedByName?: string | null };
export type DisputeAction = "opened" | "funds_withdrawn" | "funds_reinstated" | "draft_saved" | "submitted" | "reminder" | "closed";
export type DisputeEventRow = { id: string; action: DisputeAction; note: string | null; at: string; actorName: string | null };

export const isOpen = (d: { status: string }): boolean => (OPEN_STATUSES as readonly string[]).includes(d.status);
export const isClosed = (d: { status: string }): boolean => (CLOSED_STATUSES as readonly string[]).includes(d.status);
export const needsResponse = (d: { status: string; evidence_submitted: boolean }): boolean => isOpen(d) && !d.evidence_submitted;
export const byDue = (a: { evidence_due_by: string | null }, b: { evidence_due_by: string | null }): number =>
  (a.evidence_due_by ?? "9999").localeCompare(b.evidence_due_by ?? "9999");

export const humanize = (s: string): string => {
  const t = s.replace(/_/g, " ").trim();
  return t ? t[0].toUpperCase() + t.slice(1) : t;
};

const REASON_LABEL: Record<string, string> = {
  product_not_received: "Not received", fraudulent: "Fraudulent", unrecognized: "Unrecognized", product_unacceptable: "Not as described",
  credit_not_processed: "Credit not processed", duplicate: "Duplicate", subscription_canceled: "Subscription canceled", general: "General",
};
export const reasonLabel = (r: string): string => REASON_LABEL[r] ?? humanize(r);

const FRAUD_LABEL: Record<string, string> = {
  card_never_received: "Card never received", fraudulent_card_application: "Fraudulent card application",
  made_with_counterfeit_card: "Counterfeit card", made_with_lost_card: "Lost card", made_with_stolen_card: "Stolen card",
  misc: "Other fraud", unauthorized_use_of_card: "Unauthorized use of card",
};
export const fraudTypeLabel = (t: string): string => FRAUD_LABEL[t] ?? humanize(t);

export type ChipTone = "need" | "draftsaved" | "review" | "won" | "lost" | "ended";
export type Chip = { tone: ChipTone; text: string };

export function evidenceChip(d: Pick<DisputeRow, "evidence_submitted" | "draft_saved_at">): Chip {
  if (d.evidence_submitted) return { tone: "review", text: "Submitted" };
  return d.draft_saved_at ? { tone: "draftsaved", text: "Draft saved" } : { tone: "need", text: "Not started" };
}

export function outcomeChip(d: Pick<DisputeRow, "status">): Chip {
  switch (d.status) {
    case "won": return { tone: "won", text: "Won" };
    case "lost": return { tone: "lost", text: "Lost" };
    case "warning_closed": return { tone: "ended", text: "Inquiry closed" };
    case "prevented": return { tone: "ended", text: "Prevented" };
    default: return REVIEW_STATUSES.includes(d.status) ? { tone: "review", text: "In review" } : { tone: "ended", text: humanize(d.status) };
  }
}

export const statusChip = (d: Pick<DisputeRow, "status" | "evidence_submitted" | "draft_saved_at">): Chip => (isOpen(d) ? evidenceChip(d) : outcomeChip(d));

export type Due = { date: string; daysLeft: number; past: boolean; red: boolean; left: string; short: string };
// Days are whole Mountain calendar days, like every other admin date.
export function dueInfo(iso: string | null, nowMs: number): Due | null {
  if (!iso) return null;
  const past = Date.parse(iso) <= nowMs;
  const daysLeft = mountainDaysUntil(iso, nowMs);
  const n = `${daysLeft} day${daysLeft === 1 ? "" : "s"}`;
  return {
    date: shortDate(iso), daysLeft, past, red: past || daysLeft <= DISPUTE_DUE_SOON_DAYS,
    left: past ? "past due" : daysLeft === 0 ? "due today" : `${n} left`,
    short: past ? "past due" : daysLeft === 0 ? "today" : n,
  };
}

export function respondRefusal(d: Pick<DisputeRow, "status" | "evidence_submitted" | "evidence_due_by">, nowMs: number): string | null {
  if (d.evidence_submitted) return "Evidence was already submitted for this chargeback. Reload the page.";
  if (!isOpen(d)) return "This chargeback isn't waiting for a response any more. Reload the page.";
  // Stripe's clock decides deadlines: refuse here only when clearly past, so
  // a little drift between our server and Stripe never blocks a response
  // Stripe would still accept (and Stripe's own refusal is shown if late).
  if (d.evidence_due_by && nowMs - Date.parse(d.evidence_due_by) > CLOCK_DRIFT_MS) {
    return "The deadline has passed. Stripe no longer accepts evidence for this chargeback.";
  }
  return null;
}

// The reminder the daily reconcile should send now, if any: the most urgent
// DISPUTE_REMIND_DAYS entry not sent yet. Every entry at or above it is marked
// sent, so a missed 3-day reminder isn't sent after the 1-day one.
export function dueReminder(d: { evidence_due_by: string | null; reminded: Record<string, string> }, nowMs: number): { day: number; daysLeft: number; marks: Record<string, string> } | null {
  if (!d.evidence_due_by || Date.parse(d.evidence_due_by) <= nowMs) return null;
  const daysLeft = mountainDaysUntil(d.evidence_due_by, nowMs);
  const due = DISPUTE_REMIND_DAYS.filter((r) => daysLeft <= r && !d.reminded[String(r)]);
  if (!due.length) return null;
  const day = Math.min(...due);
  const stamp = new Date(nowMs).toISOString();
  const marks = { ...d.reminded };
  for (const r of DISPUTE_REMIND_DAYS) if (r >= day && !marks[String(r)]) marks[String(r)] = stamp;
  return { day, daysLeft, marks };
}

export type Suggestion = { kind: "refund" | "watch" | "close"; label: string; todo: string; hint: string; alert: string };
// What to do about an early fraud warning: refund before shipping, never after.
export function efwSuggestion(o: Pick<OrderBrief, "status" | "shippedAt">): Suggestion {
  if (o.status === "paid") {
    return { kind: "refund", label: "Cancel and refund…", todo: "Not shipped yet", hint: "refund now to avoid a chargeback", alert: "Not shipped yet: cancel and refund it in Disputes to avoid a chargeback." };
  }
  if (o.status === "shipped") {
    return {
      kind: "watch", label: "Watch", todo: o.shippedAt ? `Shipped ${shortDate(o.shippedAt)}` : "Shipped", hint: "no refund after shipping; watch for a chargeback",
      alert: "Already shipped: no refund after shipping. Watch for a chargeback; its evidence is ready if one follows.",
    };
  }
  const state = o.status === "refunded" ? "Refunded" : o.status === "cancelled" ? "Cancelled" : humanize(o.status);
  return { kind: "close", label: "Close", todo: state, hint: "nothing to refund", alert: `The order is ${state.toLowerCase()}: nothing to refund.` };
}

export type WarningActionData = { id: string; orderNumber: string; kind: Suggestion["kind"]; chargedCents: number; creditCents: number };
export const warningActionData = (w: WarningListRow): WarningActionData => ({
  id: w.id, orderNumber: w.order.number, kind: efwSuggestion(w.order).kind,
  chargedCents: w.order.totalCents - w.order.creditCents, creditCents: w.order.creditCents,
});

export const WARNING_OUTCOME: Record<WarningAction, string> = {
  refunded: "Refunded before shipping", watching: "Watched", disputed: "Became a chargeback", closed: "Closed",
};

export function orderStateChip(o: Pick<OrderBrief, "status" | "shippedAt">): { cls: string; text: string } {
  switch (o.status) {
    case "paid": return { cls: "o-paid", text: "Paid · not shipped" };
    case "shipped": return { cls: "o-shipped", text: o.shippedAt ? `Shipped ${shortDate(o.shippedAt)}` : "Shipped" };
    case "refunded": return { cls: "o-refunded", text: "Refunded" };
    case "cancelled": return { cls: "o-cancelled", text: "Cancelled" };
    default: return { cls: "o-processing", text: humanize(o.status) };
  }
}

export type DisputeStats = {
  rate: string; rateSub: string; gaugePct: number; needs: number; nextDue: string | null;
  warnings: number; notShipped: number; won: number; decided: number; recoveredCents: number;
};
// The Disputes rate strip (mock screen 1). counts: disputes opened and card
// charges paid in the last DISPUTE_RATE_DAYS.
export function disputeStats(disputes: DisputeListRow[], warnings: WarningListRow[], counts: { disputes: number; charges: number }, nowMs: number): DisputeStats {
  const open = disputes.filter(needsResponse).sort(byDue);
  const next = open.find((d) => d.evidence_due_by)?.evidence_due_by ?? null;
  const openWarnings = warnings.filter((w) => !w.resolved_at);
  const since = nowMs - DISPUTE_WON_DAYS * DAY;
  const decided = disputes.filter((d) => (d.status === "won" || d.status === "lost") && d.closed_at && Date.parse(d.closed_at) >= since);
  const won = decided.filter((d) => d.status === "won");
  const pct = counts.charges ? (counts.disputes / counts.charges) * 100 : null;
  return {
    rate: pct == null ? "—" : `${pct.toFixed(2)}%`,
    // "payments", not "charges": the order data doesn't distinguish card from
    // wallet/ACH, so the denominator is every Stripe payment, not card-only.
    rateSub: `${counts.disputes.toLocaleString("en-US")} of ${plural(counts.charges, "payment")} · Stripe reviews at ${DISPUTE_RATE_REVIEW_PCT}%`,
    gaugePct: pct == null ? 0 : Math.min(100, Math.round((pct / DISPUTE_RATE_REVIEW_PCT) * 100)),
    needs: open.length, nextDue: next ? shortDate(next) : null,
    warnings: openWarnings.length, notShipped: openWarnings.filter((w) => w.order.status === "paid").length,
    won: won.length, decided: decided.length, recoveredCents: won.reduce((s, d) => s + d.amount_cents, 0),
  };
}

export type HistoryRow = { key: string; href: string | null; orderNumber: string; customer: string; reason: string; amountCents: number; chip: Chip; when: string; sort: string };
// History: every chargeback no longer waiting for a response (in review or
// decided) and every resolved early warning, newest first.
export function historyRows(disputes: DisputeListRow[], warnings: WarningListRow[]): HistoryRow[] {
  const rows: HistoryRow[] = [
    ...disputes.filter((d) => !isOpen(d)).map((d): HistoryRow => ({
      key: d.id, href: `/admin/disputes/${d.id}`, orderNumber: d.order.number, customer: d.order.customerName, reason: reasonLabel(d.reason),
      amountCents: d.amount_cents, chip: outcomeChip(d), when: d.closed_at ? shortDate(d.closed_at) : "—", sort: d.closed_at ?? d.updated_at,
    })),
    ...warnings.filter((w) => w.resolved_at && w.resolved_action).map((w): HistoryRow => ({
      key: w.id, href: null, orderNumber: w.order.number, customer: w.order.customerName, reason: "Early warning",
      amountCents: w.order.totalCents - w.order.creditCents, chip: { tone: "ended", text: WARNING_OUTCOME[w.resolved_action!] },
      // Who acted is the audit trail for the owner's choice (Stripe's own closes have no name).
      when: `${dateTime(w.resolved_at!)}${w.resolvedByName ? ` · by ${w.resolvedByName}` : ""}`, sort: w.resolved_at!,
    })),
  ];
  return rows.sort((a, b) => b.sort.localeCompare(a.sort));
}

export function closedNote(status: string, amountCents: number): string {
  switch (status) {
    case "won": return `Won · ${usd(amountCents)} returned`;
    case "lost": return `Lost · ${usd(amountCents)} not returned`;
    case "warning_closed": return "Inquiry closed";
    case "prevented": return "Prevented";
    default: return humanize(status);
  }
}

// One line of a dispute's Activity card (mock screens 2 and 4).
export function eventText(e: DisputeEventRow): { text: string; sub: string | null } {
  const by = e.actorName ? ` by ${e.actorName}` : "";
  switch (e.action) {
    case "opened": return { text: `Chargeback opened · ${reasonLabel(e.note ?? "").toLowerCase()}`, sub: "owner alerted" };
    case "funds_withdrawn": return { text: `${e.note ?? "Funds"} withdrawn`, sub: null };
    case "funds_reinstated": return { text: `${e.note ?? "Funds"} returned`, sub: null };
    case "draft_saved": return { text: `Draft saved to Stripe${by}`, sub: null };
    case "submitted": return { text: `Evidence submitted${by}`, sub: null };
    case "reminder": return { text: `Reminder: ${e.note ?? "deadline soon"}`, sub: "owner alerted" };
    case "closed": return { text: e.note ?? "Decided", sub: "owner alerted" };
  }
}
