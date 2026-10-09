import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({ retrieve: vi.fn(), upsert: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/stripe", () => ({ getStripe: () => ({ paymentIntents: { retrieve: m.retrieve } }) }));
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: () => ({ upsert: m.upsert }) }) }));

describe("recordPaymentFee", () => {
  beforeEach(() => { m.retrieve.mockReset(); m.upsert.mockReset(); vi.spyOn(console, "error").mockImplementation(() => {}); });

  it("stores the charge's actual Stripe fee for that payment", async () => {
    m.retrieve.mockResolvedValue({ latest_charge: { balance_transaction: { fee: 3790 } } });
    m.upsert.mockResolvedValue({ error: null });
    const { recordPaymentFee } = await import("@/lib/payment-fees");
    expect(await recordPaymentFee("o1", "deposit", "pi_1")).toBe(true);
    expect(m.retrieve).toHaveBeenCalledWith("pi_1", { expand: ["latest_charge.balance_transaction"] });
    expect(m.upsert).toHaveBeenCalledWith({ order_id: "o1", payment: "deposit", fee_cents: 3790 }, { onConflict: "order_id,payment" });
  });

  it("no payment intent, no balance transaction yet, or a failure: nothing recorded, never throws", async () => {
    const { recordPaymentFee } = await import("@/lib/payment-fees");
    expect(await recordPaymentFee("o1", "order", null)).toBe(false);
    m.retrieve.mockResolvedValueOnce({ latest_charge: { balance_transaction: null } });
    expect(await recordPaymentFee("o1", "order", "pi_1")).toBe(false);
    m.retrieve.mockRejectedValueOnce(new Error("stripe down"));
    expect(await recordPaymentFee("o1", "order", "pi_1")).toBe(false);
    expect(m.upsert).not.toHaveBeenCalled();
  });
});
