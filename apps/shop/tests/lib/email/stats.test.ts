import { describe, it, expect, vi, beforeEach } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ rpc }) }));

describe("email stats", () => {
  beforeEach(() => { vi.resetModules(); rpc.mockReset(); });

  it("overview numbers", async () => {
    rpc.mockResolvedValue({ data: { confirmed: "2310", pending: 96, unsubscribed: 141, sent_30d: 6842, sent_prior_30d: 5800, bounces_30d: 41, complaints_30d: 2 }, error: null });
    const { emailOverview } = await import("@/lib/email/stats");
    expect(await emailOverview()).toEqual({ confirmed: 2310, pending: 96, unsubscribed: 141, sent_30d: 6842, sent_prior_30d: 5800, bounces_30d: 41, complaints_30d: 2 });
    expect(rpc).toHaveBeenCalledWith("admin_email_overview");
  });

  it("send stats keyed by kind, or campaign id", async () => {
    rpc.mockResolvedValue({ data: [
      { kind: "welcome_1", ref: null, sent: "912", bounced: 9, complaints: 0, unsubscribed: 6 },
      { kind: "campaign", ref: "k1", sent: 2196, bounced: 9, complaints: 0, unsubscribed: 11 },
    ], error: null });
    const { sendStats } = await import("@/lib/email/stats");
    const m = await sendStats("2026-09-05T00:00:00Z");
    expect(rpc).toHaveBeenCalledWith("admin_email_send_stats", { p_since: "2026-09-05T00:00:00Z" });
    expect(m.get("welcome_1")).toEqual({ sent: 912, bounced: 9, complaints: 0, unsubscribed: 6 });
    expect(m.get("campaign:k1")?.sent).toBe(2196);
  });

  it("attribution uses the 7-day window constant", async () => {
    rpc.mockResolvedValue({ data: [{ kind: "campaign", ref: "k1", orders: 47, revenue_cents: "1890500" }], error: null });
    const { attribution } = await import("@/lib/email/stats");
    const m = await attribution("2026-09-05T00:00:00Z");
    expect(rpc).toHaveBeenCalledWith("admin_email_attribution", { p_since: "2026-09-05T00:00:00Z", p_days: 7 });
    expect(m.get("campaign:k1")).toEqual({ orders: 47, revenueCents: 1_890_500 });
  });

  it("cart recovery and audience counts", async () => {
    rpc.mockResolvedValueOnce({ data: { reminded: 140, recovered: 53, revenue_cents: 1924000 }, error: null });
    rpc.mockResolvedValueOnce({ data: { all: 2310, ordered: 486, never_ordered: 1824 }, error: null });
    const { cartRecovery, audienceCounts } = await import("@/lib/email/stats");
    expect(await cartRecovery("2026-09-05T00:00:00Z")).toEqual({ reminded: 140, recovered: 53, revenueCents: 1_924_000 });
    expect(rpc).toHaveBeenCalledWith("admin_cart_recovery", { p_since: "2026-09-05T00:00:00Z", p_hours: 24 });
    expect(await audienceCounts()).toEqual({ all: 2310, ordered: 486, never_ordered: 1824 });
  });

  it("throws (never zeros) when a stats function fails", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "down" } });
    const { emailOverview } = await import("@/lib/email/stats");
    await expect(emailOverview()).rejects.toThrow();
  });

  it("sums a family of kinds", async () => {
    const { sumKinds } = await import("@/lib/email/stat-keys");
    const m = new Map([["welcome_1", { sent: 2, bounced: 1, complaints: 0, unsubscribed: 0 }], ["welcome_2", { sent: 3, bounced: 0, complaints: 1, unsubscribed: 1 }], ["cart_1", { sent: 9, bounced: 9, complaints: 9, unsubscribed: 9 }]]);
    expect(sumKinds(m, "welcome_")).toEqual({ sent: 5, bounced: 1, complaints: 1, unsubscribed: 1 });
  });
});
