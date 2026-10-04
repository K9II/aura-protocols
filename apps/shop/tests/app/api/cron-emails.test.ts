import { describe, it, expect, vi, beforeEach } from "vitest";

const listWelcomeCandidates = vi.fn(), sentKinds = vi.fn(), sendTracked = vi.fn(), getSubscriber = vi.fn(), lastWelcomeSentAt = vi.fn();
const listAbandonedCheckouts = vi.fn(), alertOwner = vi.fn();
vi.mock("@/lib/email/data", () => ({ listWelcomeCandidates, sentKinds, sendTracked, getSubscriber, lastWelcomeSentAt }));
vi.mock("@/lib/email/cart", () => ({ listAbandonedCheckouts }));
vi.mock("@/lib/notify", () => ({ alertOwner }));
vi.mock("@/lib/supabase/env", () => ({ siteUrl: () => "https://auraprotocols.com" }));
vi.mock("@/data/catalog", () => ({ compounds: [] }));

const auth = (s = "cron-s") => new Request("http://localhost/api/cron/emails", { headers: { authorization: `Bearer ${s}` } });
const H = 3600 * 1000, D = 24 * H;

describe("GET /api/cron/emails", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const f of [listWelcomeCandidates, sentKinds, sendTracked, getSubscriber, listAbandonedCheckouts, alertOwner, lastWelcomeSentAt]) f.mockReset();
    lastWelcomeSentAt.mockResolvedValue(null);
    process.env.CRON_SECRET = "cron-s"; process.env.EMAIL_LINK_SECRET = "s"; process.env.MAILING_ADDRESS = "Aura Protocols LLC · 1 A St";
    listWelcomeCandidates.mockResolvedValue([]); listAbandonedCheckouts.mockResolvedValue([]); sendTracked.mockResolvedValue("sent");
  });

  it("401s without the cron secret", async () => {
    const { GET } = await import("@/app/api/cron/emails/route");
    expect((await GET(auth("wrong"))).status).toBe(401);
  });

  it("sends the next due welcome file, with the code only while it's unused", async () => {
    listWelcomeCandidates.mockResolvedValue([{ email: "a@b.co", confirmed_at: new Date(Date.now() - 5.5 * D).toISOString(), welcome_code: "AURA-7K2Q", welcome_code_expires_at: new Date(Date.now() + 8 * D).toISOString(), welcome_code_used_order_id: null }]);
    sentKinds.mockResolvedValue(new Set(["welcome_1", "welcome_2"]));
    const { GET } = await import("@/app/api/cron/emails/route");
    const res = await GET(auth());
    expect(await res.json()).toMatchObject({ welcome: 1, cart: 0, failed: 0 });
    expect(sendTracked.mock.calls[0][0]).toMatchObject({ email: "a@b.co", kind: "welcome_3", ref: null });
  });

  it("sends the due cart reminder to a subscribed-or-unknown buyer, keyed by order id", async () => {
    listAbandonedCheckouts.mockResolvedValue([{ id: "o1", order_number: "AP-1042", email: "a@b.co", created_at: new Date(Date.now() - 2 * H).toISOString(), order_items: [] }]);
    sentKinds.mockResolvedValue(new Set());
    getSubscriber.mockResolvedValue(null);
    const { GET } = await import("@/app/api/cron/emails/route");
    await GET(auth());
    expect(sendTracked.mock.calls[0][0]).toMatchObject({ email: "a@b.co", kind: "cart_1", ref: "o1" });
  });

  it("skips cart reminders for unsubscribed buyers", async () => {
    listAbandonedCheckouts.mockResolvedValue([{ id: "o1", order_number: "AP-1042", email: "a@b.co", created_at: new Date(Date.now() - 2 * H).toISOString(), order_items: [] }]);
    sentKinds.mockResolvedValue(new Set());
    getSubscriber.mockResolvedValue({ status: "unsubscribed" });
    const { GET } = await import("@/app/api/cron/emails/route");
    await GET(auth());
    expect(sendTracked).not.toHaveBeenCalled();
  });

  it("keeps going after a failure and alerts the owner once with the list", async () => {
    listWelcomeCandidates.mockResolvedValue([
      { email: "a@b.co", confirmed_at: new Date(Date.now() - 2.5 * D).toISOString(), welcome_code: null, welcome_code_expires_at: null, welcome_code_used_order_id: null },
      { email: "c@d.co", confirmed_at: new Date(Date.now() - 2.5 * D).toISOString(), welcome_code: null, welcome_code_expires_at: null, welcome_code_used_order_id: null },
    ]);
    sentKinds.mockResolvedValue(new Set(["welcome_1"]));
    sendTracked.mockRejectedValueOnce(new Error("throttled")).mockResolvedValueOnce("sent");
    const { GET } = await import("@/app/api/cron/emails/route");
    expect(await (await GET(auth())).json()).toMatchObject({ welcome: 1, failed: 1 });
    expect(alertOwner).toHaveBeenCalledTimes(1);
  });
});
