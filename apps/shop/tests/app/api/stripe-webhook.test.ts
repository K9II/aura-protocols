import { describe, it, expect, vi, beforeEach } from "vitest";

const constructEvent = vi.fn();
const beginStripeEvent = vi.fn();
const finishStripeEvent = vi.fn();
const handleStripeEvent = vi.fn();
const alertOwner = vi.fn();
vi.mock("@/lib/stripe", () => ({ getStripe: () => ({ webhooks: { constructEvent } }) }));
vi.mock("@/lib/orders", () => ({ beginStripeEvent, finishStripeEvent }));
vi.mock("@/lib/stripe-events", () => ({ handleStripeEvent }));
vi.mock("@/lib/notify", () => ({ alertOwner }));

const post = (sig: string | null) => new Request("http://localhost/api/stripe/webhook", {
  method: "POST", body: "{}", headers: sig ? { "stripe-signature": sig } : {},
});

describe("POST /api/stripe/webhook", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const f of [constructEvent, beginStripeEvent, finishStripeEvent, handleStripeEvent, alertOwner]) f.mockReset();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_x";
  });

  it("rejects a missing or invalid signature", async () => {
    const { POST } = await import("@/app/api/stripe/webhook/route");
    expect((await POST(post(null))).status).toBe(400);
    constructEvent.mockImplementation(() => { throw new Error("bad sig"); });
    expect((await POST(post("t=1,v1=x"))).status).toBe(400);
    expect(handleStripeEvent).not.toHaveBeenCalled();
  });

  it("alerts the owner and asks Stripe to retry when the event ledger itself is down", async () => {
    constructEvent.mockReturnValue({ id: "evt_1", type: "charge.refunded" });
    beginStripeEvent.mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { POST } = await import("@/app/api/stripe/webhook/route");
    expect((await POST(post("sig"))).status).toBe(500);
    expect(alertOwner).toHaveBeenCalledWith(expect.stringContaining("charge.refunded"), expect.stringContaining("db down"));
    expect(handleStripeEvent).not.toHaveBeenCalled();
  });

  it("acknowledges a duplicate without processing it again", async () => {
    constructEvent.mockReturnValue({ id: "evt_1", type: "checkout.session.completed" });
    beginStripeEvent.mockResolvedValue("duplicate");
    const { POST } = await import("@/app/api/stripe/webhook/route");
    expect((await POST(post("sig"))).status).toBe(200);
    expect(handleStripeEvent).not.toHaveBeenCalled();
  });

  it("processes a new event and marks it done", async () => {
    constructEvent.mockReturnValue({ id: "evt_1", type: "checkout.session.completed" });
    beginStripeEvent.mockResolvedValue("process");
    const { POST } = await import("@/app/api/stripe/webhook/route");
    expect((await POST(post("sig"))).status).toBe(200);
    expect(finishStripeEvent).toHaveBeenCalledWith("evt_1");
  });

  it("on a handler failure records the error, alerts the owner and returns 500 so Stripe retries", async () => {
    constructEvent.mockReturnValue({ id: "evt_1", type: "checkout.session.completed" });
    beginStripeEvent.mockResolvedValue("process");
    handleStripeEvent.mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { POST } = await import("@/app/api/stripe/webhook/route");
    expect((await POST(post("sig"))).status).toBe(500);
    expect(finishStripeEvent).toHaveBeenCalledWith("evt_1", expect.stringContaining("db down"));
    expect(alertOwner).toHaveBeenCalled();
  });
});
