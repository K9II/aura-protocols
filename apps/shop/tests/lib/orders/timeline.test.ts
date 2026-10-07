import { describe, it, expect } from "vitest";
import { buildOrderTimeline, type TimelineSources } from "@/lib/orders/timeline";

const order = {
  id: "o1", created_at: "2026-09-30T20:48:00Z", paid_at: "2026-09-30T20:51:00Z", shipped_at: "2026-10-01T21:02:00Z",
  cancelled_at: null, refunded_at: null, carrier: "usps", tracking_number: "9400111899223344550112", stripe_payment_intent: "pi_1", store_credit_cents: 0, total_cents: 41_439,
};
const empty: Omit<TimelineSources, "order"> = { adminEvents: [], commission: null, disputes: [], warnings: [], inquiries: [] };

describe("buildOrderTimeline", () => {
  it("lists placed, paid, shipped newest first with who shipped it and a tracking link", () => {
    const t = buildOrderTimeline({ ...empty, order, adminEvents: [{ action: "order_shipped", at: "2026-10-01T21:02:05Z", actorName: "Alvester Adams", detail: "USPS 9400111899223344550112" }] });
    expect(t.map((e) => e.key)).toEqual(["shipped", "paid", "placed"]);
    expect(t[0]).toMatchObject({ title: "Shipped · USPS 9400111899223344550112", who: "Alvester Adams", tone: "ok" });
    expect(t[0].href).toContain("9400111899223344550112");
  });

  it("adds commission, dispute, warning and inquiry entries", () => {
    const t = buildOrderTimeline({
      order: { ...order, refunded_at: "2026-10-05T16:00:00Z", shipped_at: null },
      adminEvents: [],
      commission: { amount_cents: 5_707, rate_pct: 15, state: "void", created_at: "2026-09-30T20:51:01Z", clears_at: null, voided_at: "2026-10-05T16:00:01Z", partnerCode: "QUINN10" },
      disputes: [{ id: "d1", status: "lost", reason: "fraudulent", amount_cents: 41_439, opened_at: "2026-10-03T10:00:00Z", closed_at: "2026-10-04T10:00:00Z", outcome: "lost" }],
      warnings: [{ id: "w1", fraud_type: "made_with_stolen_card", created_at: "2026-10-02T10:00:00Z", resolved_action: "refunded", resolved_at: "2026-10-05T15:59:00Z", resolverName: "Alvester" }],
      inquiries: [{ ref: 1046, subject: "Order question", status: "needs_reply", created_at: "2026-10-03T16:14:00Z" }],
    });
    const keys = t.map((e) => e.key);
    expect(keys).toEqual(["commission-void", "refunded", "warning-w1-resolved", "dispute-d1-closed", "inquiry-1046", "dispute-d1", "warning-w1", "commission", "paid", "placed"]);
    expect(t.find((e) => e.key === "refunded")).toMatchObject({ tone: "red", detail: "in Stripe" });
    expect(t.find((e) => e.key === "dispute-d1")).toMatchObject({ href: "/admin/disputes/d1", tone: "red" });
    expect(t.find((e) => e.key === "inquiry-1046")).toMatchObject({ href: "/admin/inquiries/Q-1046", hrefLabel: "Q-1046" });
    expect(t.find((e) => e.key === "warning-w1-resolved")?.who).toBe("Alvester");
  });

  it("says store credit when the order never reached Stripe", () => {
    const t = buildOrderTimeline({ ...empty, order: { ...order, shipped_at: null, stripe_payment_intent: null, store_credit_cents: 41_439 } });
    expect(t.find((e) => e.key === "paid")?.detail).toBe("paid in store credit");
  });

  it("shows a refund done here with who did it", () => {
    const t = buildOrderTimeline({ ...empty, order: { ...order, refunded_at: "2026-10-05T16:00:00Z" }, adminEvents: [{ action: "order_refunded", at: "2026-10-05T16:00:00Z", actorName: "Alvester", detail: "store credit returned" }] });
    expect(t.find((e) => e.key === "refunded")).toMatchObject({ who: "Alvester", detail: "store credit returned" });
  });
});
