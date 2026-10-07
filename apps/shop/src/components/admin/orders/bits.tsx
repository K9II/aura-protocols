import type { OrderStatus } from "@/lib/order-status";
import type { OrderMarker } from "@/lib/orders/tabs";

const STATUS: Record<OrderStatus, string> = { awaiting_payment: "Open checkout", processing: "Processing", paid: "Paid", shipped: "Shipped", cancelled: "Cancelled", refunded: "Refunded" };
export function OrderStatusChip({ status }: { status: OrderStatus }) {
  return <span className={`a-chip o-${status}`}>{STATUS[status]}</span>;
}

const MARK: Record<OrderMarker, [string, string]> = { dispute: ["Dispute", "red"], warning: ["Warning", "amb"], code: ["Code", ""], partner: ["Partner", "sl"] };
export function Markers({ list }: { list: OrderMarker[] }) {
  return <>{list.map((m) => <span key={m} className={`a-mk ${MARK[m][1]}`.trim()}>{MARK[m][0]}</span>)}</>;
}
