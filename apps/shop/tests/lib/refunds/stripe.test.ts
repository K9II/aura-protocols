import { describe, it, expect, vi, beforeEach } from "vitest";

const refundsCreate = vi.fn();
const piRetrieve = vi.fn();
vi.mock("@/lib/stripe", () => ({ getStripe: () => ({ refunds: { create: refundsCreate }, paymentIntents: { retrieve: piRetrieve } }) }));

import { refundCard, paymentLabel } from "@/lib/refunds/stripe";

describe("refunds/stripe", () => {
  beforeEach(() => { refundsCreate.mockReset(); piRetrieve.mockReset(); });

  it("refundCard refunds one payment under the key it is given and returns the refund id", async () => {
    refundsCreate.mockResolvedValue({ id: "re_1" });
    expect(await refundCard("pi_1", 18800, "order-refund-o1")).toBe("re_1");
    expect(refundsCreate).toHaveBeenCalledWith(
      { payment_intent: "pi_1", amount: 18800, reason: "requested_by_customer" },
      { idempotencyKey: "order-refund-o1" },
    );
  });

  it("refundCard lets a Stripe error through", async () => {
    refundsCreate.mockRejectedValue(new Error("charge already refunded"));
    await expect(refundCard("pi_1", 100, "order-refund-o1")).rejects.toThrow(/already refunded/);
  });

  it("paymentLabel names the card", async () => {
    piRetrieve.mockResolvedValue({ latest_charge: { payment_method_details: { type: "card", card: { brand: "visa", last4: "4242" } } } });
    expect(await paymentLabel("pi_1")).toBe("Visa ••4242");
    expect(piRetrieve).toHaveBeenCalledWith("pi_1", { expand: ["latest_charge"] });
  });

  it("paymentLabel names a bank account", async () => {
    piRetrieve.mockResolvedValue({ latest_charge: { payment_method_details: { type: "us_bank_account", us_bank_account: { last4: "6789" } } } });
    expect(await paymentLabel("pi_1")).toBe("bank account ••6789");
  });

  it("paymentLabel falls back on anything else and never throws", async () => {
    piRetrieve.mockResolvedValue({ latest_charge: { payment_method_details: { type: "cashapp" } } });
    expect(await paymentLabel("pi_1")).toBe("the original payment");
    piRetrieve.mockResolvedValue({ latest_charge: "ch_1" });
    expect(await paymentLabel("pi_1")).toBe("the original payment");
    piRetrieve.mockRejectedValue(new Error("network"));
    expect(await paymentLabel("pi_1")).toBe("the original payment");
  });
});
