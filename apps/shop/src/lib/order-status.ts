export const ORDER_STATUSES = ["awaiting_payment", "processing", "deposit_paid", "balance_due", "paid", "shipped", "cancelled", "refunded"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

// The only transitions an order may make. Enforced in lib/orders.ts
// (transitionOrder) — nothing else writes `status`. deposit_paid and
// balance_due are wholesale-only (made to order: deposit → lot passes →
// balance); retail never enters them.
const ALLOWED: Record<OrderStatus, readonly OrderStatus[]> = {
  awaiting_payment: ["processing", "paid", "deposit_paid", "cancelled"],
  processing: ["paid", "deposit_paid", "cancelled"],
  deposit_paid: ["balance_due", "refunded"],
  balance_due: ["paid", "cancelled"],
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
  deposit_paid: "Deposit paid — in production",
  balance_due: "Balance due",
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
