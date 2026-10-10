import "server-only";
import { listOpenOrdersForCustomer, transitionOrder, willReleaseOnNewCheckout } from "@/lib/orders";
import type { CommerceAdapter } from "@/lib/commerce";

export type CloseFailure = { id: string; orderNumber: string; sessionId: string | null; error: string };

// Closes a customer's unfinished checkouts: expire the Stripe page, cancel the
// order (the cancel triggers hand back held store credit and discount-code
// uses). A session that turns out paid is left for the webhook. Starting a new
// checkout passes all: false (a young order with no Stripe page may be another
// tab still starting); blocking an account passes all: true. Never throws per
// order — the caller decides how loud a failure is.
export async function closeOpenCheckouts(customerId: string, adapter: CommerceAdapter, opts: { all: boolean }): Promise<{ closed: string[]; failed: CloseFailure[] }> {
  const closed: string[] = [];
  const failed: CloseFailure[] = [];
  for (const o of await listOpenOrdersForCustomer(customerId)) {
    try {
      if (!opts.all && !willReleaseOnNewCheckout(o)) continue;
      if (o.stripe_session_id && (await adapter.expireCheckout(o.stripe_session_id)) === "complete") continue;
      await transitionOrder(o.id, "awaiting_payment", "cancelled");
      closed.push(o.order_number);
    } catch (err) {
      failed.push({ id: o.id, orderNumber: o.order_number, sessionId: o.stripe_session_id, error: String(err) });
    }
  }
  return { closed, failed };
}
