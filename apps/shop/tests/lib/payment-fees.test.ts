import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({ retrieve: vi.fn(), upsert: vi.fn(), orders: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/stripe", () => ({ getStripe: () => ({ paymentIntents: { retrieve: m.retrieve } }) }));
const chain = () => { const q: Record<string, unknown> = {}; for (const k of ["select", "eq", "in", "gte"]) q[k] = () => q; q.limit = () => m.orders(); return q; };
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: (t: string) => (t === "orders" ? chain() : { upsert: m.upsert }) }) }));

describe("recordPaymentFee", () => {
  beforeEach(() => { m.retrieve.mockReset(); m.upsert.mockReset(); vi.spyOn(console, "error").mockImplementation(() => {}); vi.spyOn(console, "warn").mockImplementation(() => {}); });

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

  it("backfill records only the payments still missing a fee", async () => {
    m.orders.mockResolvedValue({ data: [
      { id: "o1", channel: "retail", stripe_payment_intent: "pi_r", payment_fees: [] },
      { id: "o2", channel: "wholesale", deposit_payment_intent: "pi_d", balance_payment_intent: "pi_b", payment_fees: [{ payment: "deposit" }] },
      { id: "o3", channel: "retail", stripe_payment_intent: "pi_x", payment_fees: [{ payment: "order" }] },
    ], error: null });
    m.retrieve.mockResolvedValue({ latest_charge: { balance_transaction: { fee: 100 } } });
    m.upsert.mockResolvedValue({ error: null });
    const { backfillPaymentFees } = await import("@/lib/payment-fees");
    expect(await backfillPaymentFees("2026-10-01T00:00:00Z")).toEqual({ filled: 2, tried: 2 });
    expect(m.retrieve.mock.calls.map((c) => c[0])).toEqual(["pi_r", "pi_b"]);
  });
});
