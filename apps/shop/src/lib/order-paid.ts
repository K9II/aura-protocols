import "server-only";

// Everything that happens once an order is paid (P12): partner commission,
// store-credit debit, Stripe Tax transaction, confirmation + owner emails.
export async function afterOrderPaid(orderId: string): Promise<void> {
  void orderId;
}
