import { describe, it, expect, afterEach } from "vitest";
import { stripeLive, stripePaymentUrl } from "@/lib/stripe-dashboard";

describe("stripe-dashboard", () => {
  afterEach(() => { delete process.env.STRIPE_SECRET_KEY; });

  it("live for sk_live_ and rk_live_ keys only", () => {
    expect(stripeLive("sk_live_abc")).toBe(true);
    expect(stripeLive("rk_live_abc")).toBe(true);
    expect(stripeLive("sk_test_abc")).toBe(false);
    expect(stripeLive("rk_test_abc")).toBe(false);
    expect(stripeLive(undefined)).toBe(false);
  });

  it("links the payment, under /test/ when not live", () => {
    expect(stripePaymentUrl("pi_1")).toBe("https://dashboard.stripe.com/test/payments/pi_1");
    process.env.STRIPE_SECRET_KEY = "rk_live_x";
    expect(stripePaymentUrl("pi_1")).toBe("https://dashboard.stripe.com/payments/pi_1");
  });
});
