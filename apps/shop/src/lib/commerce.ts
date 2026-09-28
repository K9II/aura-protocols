import type { CartLine } from "@/lib/cart";

export type CheckoutResult =
  | { kind: "redirect"; url: string }
  | { kind: "unavailable"; message: string };

// The payments spec replaces the stub with a real adapter (Stripe first,
// high-risk processor as fallback). Storefront code only calls this interface.
export interface CommerceAdapter {
  createCheckout(lines: CartLine[]): Promise<CheckoutResult>;
}

export const CHECKOUT_UNAVAILABLE_MESSAGE =
  "Checkout opens soon — we'll email you the moment it's live.";

const stubAdapter: CommerceAdapter = {
  async createCheckout() {
    return { kind: "unavailable", message: CHECKOUT_UNAVAILABLE_MESSAGE };
  },
};

export function getCommerceAdapter(): CommerceAdapter {
  return stubAdapter;
}
