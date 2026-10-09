import { describe, it, expect } from "vitest";
import { buildOrderTimeline, type TimelineSources } from "@/lib/orders/timeline";

const order = {
  id: "o1", created_at: "2026-09-30T20:48:00Z", paid_at: "2026-09-30T20:51:00Z", shipped_at: "2026-10-01T21:02:00Z",
  cancelled_at: null, refunded_at: null, carrier: "usps", tracking_number: "9400111899223344550112", stripe_payment_intent: "pi_1", store_credit_cents: 0, total_cents: 41_439,
};
const empty: Omit<TimelineSources, "order"> = { adminEvents: [], commission: null, disputes: [], warnings: [], inquiries: [] };

describe("buildOrderTimeline", () => {
  it("a wholesale order: deposit (joined the run) → kits passed, balance requested → reminder → balance paid, linked to its run", () => {
    const t = buildOrderTimeline({
      ...empty,
      order: { ...order, shipped_at: null, channel: "wholesale", deposit_cents: 129_600, balance_cents: 194_950,
        deposit_paid_at: "2026-10-09T03:07:00Z", balance_due_at: "2026-10-09T04:20:00Z", paid_at: "2026-10-09T04:34:00Z" },
      wholesale: { run: { id: "r1", number: "R-1004" }, events: [{ kind: "reminder_sent", at: "2026-10-09T04:25:00Z", detail: null }, { kind: "note", at: "2026-10-09T04:26:00Z", detail: "x" }] },
    });
    expect(t.map((e) => e.title)).toEqual([
      "Balance paid · $1,949.50", "Balance reminder emailed", "Kits passed · balance of $1,949.50 requested", "Deposit paid · $1,296.00", "Placed",
    ]);
    expect(t.find((e) => e.key === "deposit")).toMatchObject({ detail: "joined run R-1004", href: "/admin/wholesale/runs/r1", hrefLabel: "R-1004" });
  });

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
    expect(t.find((e) => e.key === "refunded")).toMatchObject({ tone: "red", title: "Refunded in Stripe" });
    expect(t.find((e) => e.key === "dispute-d1")).toMatchObject({ href: "/admin/disputes/d1", tone: "red" });
    expect(t.find((e) => e.key === "inquiry-1046")).toMatchObject({ href: "/admin/inquiries/Q-1046", hrefLabel: "Q-1046" });
    expect(t.find((e) => e.key === "warning-w1-resolved")?.who).toBe("Alvester");
  });

  it("says store credit when the order never reached Stripe", () => {
    const t = buildOrderTimeline({ ...empty, order: { ...order, shipped_at: null, stripe_payment_intent: null, store_credit_cents: 41_439 } });
    expect(t.find((e) => e.key === "paid")?.detail).toBe("paid in store credit");
  });

  describe("an admin refund (r4)", () => {
    const ev = { action: "order_refunded", at: "2026-10-02T16:41:00Z", actorName: "Alvester", detail: "$228.00 · card + store credit · Customer asked to cancel" };
    const refunded = { ...order, shipped_at: null, refunded_at: "2026-10-02T16:41:00Z", total_cents: 22_800, refund_reason: "customer_cancelled", refund_note: "Ordered the wrong strength — Q-1049" };

    it("before shipping: Cancelled and refunded, who, note and vials back to stock", () => {
      const t = buildOrderTimeline({ ...empty, order: refunded, adminEvents: [ev], refund: { byName: "Alvester", vials: 3 } });
      expect(t.find((e) => e.key === "refunded")).toEqual({
        key: "refunded", at: "2026-10-02T16:41:00Z", tone: "red", title: "Cancelled and refunded", sub: "$228.00 · Customer asked to cancel",
        who: "Alvester", detail: "“Ordered the wrong strength — Q-1049” · 3 vials back to stock",
      });
    });

    it("after shipping: Refunded — exception, vials stayed out; no note → just the vials", () => {
      const t = buildOrderTimeline({ ...empty, order: { ...refunded, shipped_at: "2026-10-01T21:02:00Z", refund_reason: "goodwill", refund_note: null }, adminEvents: [], refund: { byName: "Alvester", vials: 3 } });
      expect(t.find((e) => e.key === "refunded")).toMatchObject({ title: "Refunded — exception", sub: "$228.00 · Goodwill", who: "Alvester", detail: "vials stayed out" });
    });

    it("the refunder falls back to the event's actor", () => {
      const t = buildOrderTimeline({ ...empty, order: refunded, adminEvents: [ev], refund: { byName: null, vials: 1 } });
      expect(t.find((e) => e.key === "refunded")).toMatchObject({ who: "Alvester", detail: "“Ordered the wrong strength — Q-1049” · 1 vial back to stock" });
    });
  });

  it("shows a refund done here with who did it", () => {
    const t = buildOrderTimeline({ ...empty, order: { ...order, refunded_at: "2026-10-05T16:00:00Z" }, adminEvents: [{ action: "order_refunded", at: "2026-10-05T16:00:00Z", actorName: "Alvester", detail: "store credit returned" }] });
    expect(t.find((e) => e.key === "refunded")).toMatchObject({ title: "Refunded", who: "Alvester", detail: "store credit returned" });
  });

  it("a no-charge order starts with Created — no charge (who, note, vials held) and the On its way soon email", () => {
    const nc = { ...order, shipped_at: null, stripe_payment_intent: null, created_at: "2026-10-06T16:22:00Z", paid_at: "2026-10-06T16:22:01Z" };
    const t = buildOrderTimeline({
      ...empty, order: nc,
      adminEvents: [{ action: "no_charge_created", at: "2026-10-06T16:22:02Z", actorName: "Alvester", detail: "Replacement · $192.00 retail · email: sent" }],
      noCharge: { reason: "replacement", replacesNumber: "AP-1052", note: "2 vials cracked in transit", vials: 3, email: "dana.w@example.com" },
    });
    expect(t.map((e) => e.key)).toEqual(["email", "created"]);
    expect(t[1]).toMatchObject({ tone: "ok", title: "Created — no charge", sub: "Replacement for AP-1052", who: "Alvester", detail: "“2 vials cracked in transit” · 3 vials held" });
    expect(t[0]).toMatchObject({ title: "Email sent", sub: "“On its way soon”", detail: "to dana.w@example.com" });
  });

  it("an email that failed reads Email failed, in red", () => {
    const nc = { ...order, shipped_at: null, stripe_payment_intent: null, created_at: "2026-10-06T16:22:00Z", paid_at: "2026-10-06T16:22:01Z" };
    const t = buildOrderTimeline({
      ...empty, order: nc,
      adminEvents: [{ action: "no_charge_created", at: "2026-10-06T16:22:02Z", actorName: "Alvester", detail: "Seeding · $48.00 retail · email: failed" }],
      noCharge: { reason: "seeding", replacesNumber: null, note: null, vials: 1, email: "dana.w@example.com" },
    });
    expect(t.map((e) => e.key)).toEqual(["email", "created"]);
    expect(t[0]).toMatchObject({ title: "Email failed", sub: "“On its way soon”", tone: "red", detail: "to dana.w@example.com" });
    expect(t.some((e) => e.title === "Email sent")).toBe(false);
  });

  it("no email line when it was off; the reason when it isn't a replacement; Cancelled (no charge) on a refund", () => {
    const nc = { ...order, shipped_at: null, stripe_payment_intent: null, refunded_at: "2026-10-07T16:00:00Z" };
    const t = buildOrderTimeline({
      ...empty, order: nc,
      adminEvents: [
        { action: "no_charge_created", at: "2026-09-30T20:51:00Z", actorName: "Alvester", detail: "Seeding · $48.00 retail · email: off" },
        { action: "no_charge_cancelled", at: "2026-10-07T16:00:01Z", actorName: "Alvester", detail: null },
      ],
      noCharge: { reason: "seeding", replacesNumber: null, note: null, vials: 1, email: "dana.w@example.com" },
    });
    expect(t.map((e) => e.key)).toEqual(["refunded", "created"]);
    expect(t[1]).toMatchObject({ sub: "Seeding", detail: "1 vial held" });
    expect(t[0]).toMatchObject({ title: "Cancelled (no charge)", detail: "vials back in stock", who: "Alvester", tone: "plain" });
  });
});
