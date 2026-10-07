// Links into the Stripe dashboard. Pure (reads the key's prefix only).
// A live secret or restricted key (sk_live_ / rk_live_) → live dashboard;
// anything else → the /test/ dashboard.
export function stripeLive(key: string | undefined = process.env.STRIPE_SECRET_KEY): boolean {
  return /^(sk|rk)_live_/.test(key ?? "");
}

// The payment's page (its refunds are listed there too).
export function stripePaymentUrl(paymentIntent: string): string {
  return `https://dashboard.stripe.com/${stripeLive() ? "" : "test/"}payments/${paymentIntent}`;
}
