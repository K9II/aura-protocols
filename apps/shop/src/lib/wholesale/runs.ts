// Production runs (spec 2026-10-08-wholesale-kits-design.md, Part 2). Pure.
// A run is keyed by its cutoff date; its status is derived, never stored.
import type { OrderStatus } from "@/lib/order-status";

export const MAX_SUPPLIERS_PER_RUN = 2;     // feedback: max 2 suppliers per order
export const PAST_CUTOFF_ALERT_DAYS = 2;    // Today + alert when a closed run isn't ordered by then
export const BALANCE_REMINDER_DAY = 5;      // reminder email this many days after "kits passed"
const DAY = 24 * 3600 * 1000;

export type LineResult = "pending" | "passed" | "failed";
export type RunLine = {
  id: string; slug: string; variant_id: string; kits_ordered: number | null; extra_boxes: number;
  supplier: string | null; cost_cents: number | null; supplier_ref: string | null; ordered_at: string | null;
  lot_id: string | null; result: LineResult; result_at: string | null; fail_note: string | null;
};
export type RunOrderItem = { compound_slug: string; variant_id: string; quantity: number };
export type RunOrder = { id: string; order_number: string; status: OrderStatus; items: RunOrderItem[] };
export type LineStage = "to_order" | "ordered" | "received" | "passed" | "failed";
export type RunStatus = "collecting" | "to_order" | "in_production" | "ready_to_ship" | "done";
export const RUN_STATUS_LABEL: Record<RunStatus, string> = {
  collecting: "Collecting", to_order: "To order", in_production: "In production", ready_to_ship: "Ready to ship", done: "Done",
};

const LIVE: readonly OrderStatus[] = ["deposit_paid", "balance_due", "paid", "shipped"];
export const strengthKey = (slug: string, variantId: string) => `${slug}/${variantId}`;

export function kitsByStrength(orders: RunOrder[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const o of orders) {
    if (!LIVE.includes(o.status)) continue;
    for (const i of o.items) m.set(strengthKey(i.compound_slug, i.variant_id), (m.get(strengthKey(i.compound_slug, i.variant_id)) ?? 0) + i.quantity);
  }
  return m;
}

export function lineStage(l: RunLine): LineStage {
  if (l.result === "passed") return "passed";
  if (l.result === "failed") return "failed";
  if (l.lot_id) return "received";
  return l.ordered_at ? "ordered" : "to_order";
}

// Collecting until the cutoff day ends; Done when nothing is left to make or ship.
export function runStatus(cutoff: string, today: string, lines: RunLine[], orders: RunOrder[]): RunStatus {
  if (today <= cutoff) return "collecting";
  const open = orders.filter((o) => o.status === "deposit_paid" || o.status === "balance_due" || o.status === "paid");
  if (open.length === 0) return "done";
  const needed = kitsByStrength(open);
  const lineFor = (k: string) => lines.find((l) => strengthKey(l.slug, l.variant_id) === k);
  if ([...needed.keys()].some((k) => !lineFor(k)?.ordered_at && lineFor(k)?.result !== "passed")) return "to_order";
  if (open.some((o) => o.status === "deposit_paid")) return "in_production";
  return "ready_to_ship";
}

export function orderReady(o: RunOrder, lines: RunLine[]): boolean {
  return o.items.every((i) => lines.some((l) => l.slug === i.compound_slug && l.variant_id === i.variant_id && l.result === "passed"));
}

export function orderHasFailedStrength(o: RunOrder, lines: RunLine[]): boolean {
  return o.items.some((i) => lines.some((l) => l.slug === i.compound_slug && l.variant_id === i.variant_id && l.result === "failed"));
}

// Recording `supplier` on `lineId` keeps the run at MAX_SUPPLIERS_PER_RUN or fewer.
export function suppliersOk(lines: RunLine[], supplier: string, lineId: string): boolean {
  const used = new Set(lines.filter((l) => l.id !== lineId && l.supplier).map((l) => l.supplier!.trim().toLowerCase()));
  used.add(supplier.trim().toLowerCase());
  return used.size <= MAX_SUPPLIERS_PER_RUN;
}

export function balanceTiming(balanceDueAt: string, balanceDays: number): { remindAt: number; overdueAt: number; forfeitAt: number } {
  const start = Date.parse(balanceDueAt);
  return { remindAt: start + BALANCE_REMINDER_DAY * DAY, overdueAt: start + balanceDays * DAY, forfeitAt: start + (balanceDays + 1) * DAY };
}

export const daysSince = (date: string, today: string) => Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${date}T12:00:00Z`)) / DAY);

// "10mg" → "10 mg" (variant ids are derived from the strength label).
export const strengthText = (variantId: string): string =>
  variantId.replace(/^(\d+(?:\.\d+)?)(mg|mcg|iu)$/i, (_, n: string, u: string) => `${n} ${u.toLowerCase() === "iu" ? "IU" : u.toLowerCase()}`);

export const STAGE_CHIP: Record<LineStage, { cls: string; text: string }> = {
  to_order: { cls: "need", text: "To order" }, ordered: { cls: "sched", text: "Ordered" }, received: { cls: "draft", text: "Received" },
  passed: { cls: "c-live", text: "Passed" }, failed: { cls: "red", text: "Failed" },
};
export const RUN_CHIP: Record<RunStatus, string> = { collecting: "sched", to_order: "red", in_production: "amber", ready_to_ship: "active", done: "ended" };
