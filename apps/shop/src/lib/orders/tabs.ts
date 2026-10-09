// Owner Orders list rules. Pure.
import type { OrderStatus } from "@/lib/order-status";

export const ORDER_TABS = ["to_ship", "processing", "wholesale", "shipped", "closed", "all"] as const;
export type OrderTab = (typeof ORDER_TABS)[number];
export const ORDER_TAB_LABEL: Record<OrderTab, string> = { to_ship: "To ship", processing: "Processing", wholesale: "Wholesale", shipped: "Shipped", closed: "Closed", all: "All" };
export const ORDER_PAGE_SIZE = 50;

// "All" = every order that reached payment (unfinished checkouts are never listed).
export const TAB_STATUSES: Record<OrderTab, readonly OrderStatus[]> = {
  to_ship: ["paid"],
  processing: ["processing"],
  wholesale: ["deposit_paid", "balance_due"],   // made-to-order kits in production or awaiting the balance
  shipped: ["shipped"],
  closed: ["cancelled", "refunded"],
  all: ["processing", "deposit_paid", "balance_due", "paid", "shipped", "cancelled", "refunded"],
};

// Old links used ?status=<order status>; they keep working.
const LEGACY: Record<string, OrderTab> = { paid: "to_ship", processing: "processing", shipped: "shipped", cancelled: "closed", refunded: "closed", all: "all" };

export function parseOrderTab(tab?: string, legacyStatus?: string): OrderTab {
  if (tab && (ORDER_TABS as readonly string[]).includes(tab)) return tab as OrderTab;
  if (legacyStatus && LEGACY[legacyStatus]) return LEGACY[legacyStatus];
  return "to_ship";
}

// Characters that would break an ilike pattern or the .or() filter string.
export const cleanOrderSearch = (q: string): string => q.trim().replace(/[%_\\,()"'*]/g, "").slice(0, 100);

export function itemsSummary(items: Array<{ pack_qty: number; quantity: number }>): string {
  const vials = items.reduce((s, i) => s + i.pack_qty * i.quantity, 0);
  return `${items.length} item${items.length === 1 ? "" : "s"} · ${vials} vial${vials === 1 ? "" : "s"}`;
}

export type OrderMarker = "wholesale" | "no_charge" | "dispute" | "warning" | "code" | "partner";
export function orderMarkers(o: { discount_code_id: string | null; partner_id: string | null; kind?: "sale" | "no_charge" | null; channel?: "retail" | "wholesale" }, f: { dispute: boolean; warning: boolean }): OrderMarker[] {
  const out: OrderMarker[] = [];
  if (o.channel === "wholesale") out.push("wholesale");
  if (o.kind === "no_charge") out.push("no_charge");
  if (f.dispute) out.push("dispute");
  if (f.warning) out.push("warning");
  if (o.discount_code_id) out.push("code");
  if (o.partner_id) out.push("partner");
  return out;
}
