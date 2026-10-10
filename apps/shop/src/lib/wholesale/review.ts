// Wholesale buyer review (spec 2026-10-10-wholesale-buyer-review-design.md). Pure.
// One line per unreviewed buyer with a paid deposit; red from REVIEW_WARN_DAYS before
// the earliest order-by date of their orders (and after it). Never blocks a run.
import { daysBetween } from "@/lib/today/time";

export const REVIEW_WARN_DAYS = 2;

export type UnreviewedOrder = {
  orderId: string; orderNumber: string; customerId: string; name: string; organization: string | null;
  email: string; field: string | null; depositCents: number; kits: number; cutoffOn: string;
};
export type ReviewLine = {
  customerId: string; name: string; organization: string | null; email: string; field: string | null;
  orders: string[]; kits: number; depositCents: number; cutoffOn: string; red: boolean;
};

export function reviewLines(rows: UnreviewedOrder[], today: string): ReviewLine[] {
  const by = new Map<string, ReviewLine>();
  for (const r of rows) {
    const l = by.get(r.customerId);
    if (!l) {
      by.set(r.customerId, { customerId: r.customerId, name: r.name, organization: r.organization, email: r.email, field: r.field,
        orders: [r.orderNumber], kits: r.kits, depositCents: r.depositCents, cutoffOn: r.cutoffOn, red: false });
      continue;
    }
    l.orders.push(r.orderNumber); l.kits += r.kits; l.depositCents += r.depositCents;
    if (r.cutoffOn < l.cutoffOn) l.cutoffOn = r.cutoffOn;
  }
  const lines = [...by.values()];
  for (const l of lines) l.red = daysBetween(today, l.cutoffOn) <= REVIEW_WARN_DAYS;
  return lines.sort((a, b) => a.cutoffOn.localeCompare(b.cutoffOn) || a.name.localeCompare(b.name));
}
