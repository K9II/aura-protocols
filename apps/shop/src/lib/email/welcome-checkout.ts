// Server-side check of a subscriber's welcome code at checkout: the code
// must belong to the signed-in customer's email and be their first order.
import "server-only";
import { getSubscriberByCode, hasPaidOrder } from "@/lib/email/data";
import { checkWelcomeCode, normalizeWelcomeCode, type WelcomeCheck } from "@/lib/email/welcome-code";

export async function checkWelcomeForCustomer(code: string, customer: { id: string; email: string }): Promise<WelcomeCheck> {
  const row = await getSubscriberByCode(normalizeWelcomeCode(code));
  return checkWelcomeCode({ code, buyerEmail: customer.email, row, hasPaidOrder: await hasPaidOrder(customer.id) });
}
