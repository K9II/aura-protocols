import { statusLabelFor, type OrderStatus } from "@/lib/order-status";
import type { OrderMarker } from "@/lib/orders/tabs";

const STATUS: Record<OrderStatus, string> = { awaiting_payment: "Open checkout", processing: "Processing", deposit_paid: "Deposit paid", balance_due: "Balance due", paid: "Paid", shipped: "Shipped", cancelled: "Cancelled", refunded: "Refunded" };
// A cancelled no-charge order (paid → refunded, no money moved) reads
// "Cancelled (no charge)" in the cancelled style, never "Refunded".
export function OrderStatusChip({ status, kind }: { status: OrderStatus; kind?: "sale" | "no_charge" | null }) {
  if (kind === "no_charge" && status === "refunded") return <span className="a-chip o-cancelled">{statusLabelFor({ status, kind })}</span>;
  return <span className={`a-chip o-${status}`}>{STATUS[status]}</span>;
}

const MARK: Record<OrderMarker, [string, string]> = { no_charge: ["No charge", "amb"], dispute: ["Dispute", "red"], warning: ["Warning", "amb"], code: ["Code", ""], partner: ["Partner", "sl"] };
export function Markers({ list }: { list: OrderMarker[] }) {
  return <>{list.map((m) => <span key={m} className={`a-mk ${MARK[m][1]}`.trim()}>{MARK[m][0]}</span>)}</>;
}
