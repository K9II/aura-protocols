// One line of a customer's Activity (Customers page and Admin → Activity).
import type { CustomerEvent } from "@/lib/customers/data";
import { CATEGORY_LABEL, type CreditCategory } from "@/lib/customers/rules";
import { usd } from "@/lib/html";

export function customerEventText(e: Pick<CustomerEvent, "kind" | "amount_cents" | "reason" | "note" | "actorName">): React.ReactNode {
  const who = e.actorName ?? "Owner";
  switch (e.kind) {
    case "blocked": return <>{who} <b>blocked</b> the account{e.note ? ` · ${e.note}` : ""}</>;
    case "unblocked": return <>{who} unblocked the account</>;
    case "credit_added": return <>{who} added <b>{usd(e.amount_cents ?? 0)}</b> store credit · {CATEGORY_LABEL[e.reason as CreditCategory] ?? e.reason}</>;
    case "credit_removed": return <>{who} removed <b>{usd(e.amount_cents ?? 0)}</b> store credit · {CATEGORY_LABEL[e.reason as CreditCategory] ?? e.reason}</>;
    case "verify_resent": return <>{who} resent the verification email</>;
    case "warning_refunded": return <>{who} <b>cancelled and refunded</b> {e.reason} · early fraud warning</>;
    case "warning_watched": return <>{who} chose <b>Watch</b> on {e.reason} · early fraud warning, already shipped</>;
    case "warning_closed": return <>{who} closed the early fraud warning on {e.reason}</>;
  }
}
