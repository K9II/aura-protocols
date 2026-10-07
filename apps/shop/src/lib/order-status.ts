export const ORDER_STATUSES = ["awaiting_payment", "processing", "paid", "shipped", "cancelled", "refunded"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

// The only transitions an order may make. Enforced in lib/orders.ts
// (transitionOrder) — nothing else writes `status`.
const ALLOWED: Record<OrderStatus, readonly OrderStatus[]> = {
  awaiting_payment: ["processing", "paid", "cancelled"],
  processing: ["paid", "cancelled"],
  paid: ["shipped", "refunded"],
  shipped: ["refunded"],
  cancelled: [],
  refunded: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED[from].includes(to);
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  awaiting_payment: "Awaiting payment",
  processing: "Payment processing",
  paid: "Paid — preparing to ship",
  shipped: "Shipped",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

// A cancelled no-charge order is a paid → refunded transition with no money
// moved, so it reads "Cancelled (no charge)", never "Refunded".
export function statusLabelFor(o: { status: OrderStatus; kind?: "sale" | "no_charge" | null }): string {
  return o.kind === "no_charge" && o.status === "refunded" ? "Cancelled (no charge)" : STATUS_LABEL[o.status];
}
