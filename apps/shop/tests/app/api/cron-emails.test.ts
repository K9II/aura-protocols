import { describe, it, expect, vi, beforeEach } from "vitest";

const listWelcomeCandidates = vi.fn(), sentKinds = vi.fn(), sendTracked = vi.fn(), getSubscriber = vi.fn(), welcomeSendsFor = vi.fn();
const listAbandonedCheckouts = vi.fn(), alertOwner = vi.fn(), getOrderById = vi.fn();
vi.mock("@/lib/email/data", () => ({ listWelcomeCandidates, sentKinds, sendTracked, getSubscriber, welcomeSendsFor }));
vi.mock("@/lib/email/cart", () => ({ listAbandonedCheckouts }));
vi.mock("@/lib/orders", () => ({ getOrderById }));
vi.mock("@/lib/notify", () => ({ alertOwner }));
vi.mock("@/lib/supabase/env", () => ({ siteUrl: () => "https://auraprotocols.com" }));
vi.mock("@/data/catalog", () => ({ compounds: [] }));

const auth = (s = "cron-s") => new Request("http://localhost/api/cron/emails", { headers: { authorization: `Bearer ${s}` } });
const H = 3600 * 1000, D = 24 * H;

describe("GET /api/cron/emails", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const f of [listWelcomeCandidates, sentKinds, sendTracked, getSubscriber, listAbandonedCheckouts, alertOwner, welcomeSendsFor, getOrderById]) f.mockReset();
    welcomeSendsFor.mockResolvedValue(new Map());
    getOrderById.mockResolvedValue({ status: "awaiting_payment" });
    process.env.CRON_SECRET = "cron-s"; process.env.EMAIL_LINK_SECRET = "s"; process.env.MAILING_ADDRESS = "Aura Protocols LLC · 1 A St";
    listWelcomeCandidates.mockResolvedValue([]); listAbandonedCheckouts.mockResolvedValue([]); sendTracked.mockResolvedValue("sent");
  });

  it("401s without the cron secret", async () => {
    const { GET } = await import("@/app/api/cron/emails/route");
    expect((await GET(auth("wrong"))).status).toBe(401);
  });

  it("sends the next due welcome file, with the code only while it's unused", async () => {
    listWelcomeCandidates.mockResolvedValue([{ email: "a@b.co", confirmed_at: new Date(Date.now() - 5.5 * D).toISOString(), welcome_code: "AURA-7K2Q", welcome_code_expires_at: new Date(Date.now() + 8 * D).toISOString(), welcome_code_used_order_id: null }]);
    welcomeSendsFor.mockResolvedValue(new Map([["a@b.co", { kinds: new Set(["welcome_1", "welcome_2"]), lastSentMs: null }]]));
    const { GET } = await import("@/app/api/cron/emails/route");
    const res = await GET(auth());
    expect(await res.json()).toMatchObject({ welcome: 1, cart: 0, failed: 0 });
    expect(sendTracked.mock.calls[0][0]).toMatchObject({ email: "a@b.co", kind: "welcome_3", ref: null });
  });

  it("hides the welcome code in File 01 once it's used or expired", async () => {
    listWelcomeCandidates.mockResolvedValue([
      { email: "used@b.co", confirmed_at: new Date().toISOString(), welcome_code: "AURA-USED1", welcome_code_expires_at: new Date(Date.now() + 8 * D).toISOString(), welcome_code_used_order_id: "o1" },
      { email: "expired@b.co", confirmed_at: new Date().toISOString(), welcome_code: "AURA-EXPQ1", welcome_code_expires_at: new Date(Date.now() - 1 * H).toISOString(), welcome_code_used_order_id: null },
    ]);
    const { GET } = await import("@/app/api/cron/emails/route");
    await GET(auth());
    expect(sendTracked).toHaveBeenCalledTimes(2);
    for (const call of sendTracked.mock.calls) {
      expect(call[0].msg.html).not.toMatch(/AURA-(USED1|EXPQ1)/);
    }
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

  it("re-checks the order status right before sending and skips it if it's no longer awaiting payment", async () => {
    listAbandonedCheckouts.mockResolvedValue([{ id: "o1", order_number: "AP-1042", email: "a@b.co", created_at: new Date(Date.now() - 2 * H).toISOString(), order_items: [] }]);
    sentKinds.mockResolvedValue(new Set());
    getSubscriber.mockResolvedValue(null);
    getOrderById.mockResolvedValue({ status: "paid" });
    const { GET } = await import("@/app/api/cron/emails/route");
    await GET(auth());
    expect(sendTracked).not.toHaveBeenCalled();
  });

  it("flags the cart email as promotional for a non-confirmed address, not for a confirmed subscriber", async () => {
    listAbandonedCheckouts.mockResolvedValue([
      { id: "o1", order_number: "AP-1042", email: "new@b.co", created_at: new Date(Date.now() - 2 * H).toISOString(), order_items: [] },
      { id: "o2", order_number: "AP-1043", email: "sub@b.co", created_at: new Date(Date.now() - 2 * H).toISOString(), order_items: [] },
    ]);
    sentKinds.mockResolvedValue(new Set());
    getSubscriber.mockImplementation(async (email: string) => (email === "sub@b.co" ? { status: "confirmed" } : null));
    const { GET } = await import("@/app/api/cron/emails/route");
    await GET(auth());
    expect(sendTracked.mock.calls[0][0].msg.html).toContain("promotional reminder");
    expect(sendTracked.mock.calls[1][0].msg.html).not.toContain("promotional reminder");
  });

  it("keeps going after a failure and alerts the owner once with the list", async () => {
    listWelcomeCandidates.mockResolvedValue([
      { email: "a@b.co", confirmed_at: new Date(Date.now() - 2.5 * D).toISOString(), welcome_code: null, welcome_code_expires_at: null, welcome_code_used_order_id: null },
      { email: "c@d.co", confirmed_at: new Date(Date.now() - 2.5 * D).toISOString(), welcome_code: null, welcome_code_expires_at: null, welcome_code_used_order_id: null },
    ]);
    welcomeSendsFor.mockResolvedValue(new Map([
      ["a@b.co", { kinds: new Set(["welcome_1"]), lastSentMs: null }],
      ["c@d.co", { kinds: new Set(["welcome_1"]), lastSentMs: null }],
    ]));
    sendTracked.mockRejectedValueOnce(new Error("throttled")).mockResolvedValueOnce("sent");
    const { GET } = await import("@/app/api/cron/emails/route");
    expect(await (await GET(auth())).json()).toMatchObject({ welcome: 1, failed: 1 });
    expect(alertOwner).toHaveBeenCalledTimes(1);
  });

  it("keeps going when the welcome list itself fails, and still sends the due cart reminder, with one alert", async () => {
    listWelcomeCandidates.mockRejectedValue(new Error("db down"));
    listAbandonedCheckouts.mockResolvedValue([{ id: "o1", order_number: "AP-1042", email: "a@b.co", created_at: new Date(Date.now() - 2 * H).toISOString(), order_items: [] }]);
    sentKinds.mockResolvedValue(new Set());
    getSubscriber.mockResolvedValue(null);
    const { GET } = await import("@/app/api/cron/emails/route");
    const res = await GET(auth());
    expect(await res.json()).toMatchObject({ welcome: 0, cart: 1, failed: 1 });
    expect(alertOwner).toHaveBeenCalledTimes(1);
    expect(alertOwner.mock.calls[0][1]).toContain("welcome list:");
  });

  it("keeps going when the abandoned-checkout list itself fails, after sending due welcome files", async () => {
    listWelcomeCandidates.mockResolvedValue([{ email: "a@b.co", confirmed_at: new Date(Date.now() - 2.5 * D).toISOString(), welcome_code: null, welcome_code_expires_at: null, welcome_code_used_order_id: null }]);
    welcomeSendsFor.mockResolvedValue(new Map());
    listAbandonedCheckouts.mockRejectedValue(new Error("db down"));
    const { GET } = await import("@/app/api/cron/emails/route");
    const res = await GET(auth());
    expect(await res.json()).toMatchObject({ welcome: 1, cart: 0, failed: 1 });
    expect(alertOwner).toHaveBeenCalledTimes(1);
    expect(alertOwner.mock.calls[0][1]).toContain("cart list:");
  });

  it("stops before the 240s deadline and reports how many are left, without starting the cart loop", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      const base = new Date("2026-12-01T00:00:00Z");
      vi.setSystemTime(base);
      listWelcomeCandidates.mockResolvedValue([
        { email: "a@b.co", confirmed_at: new Date(base.getTime() - 2.5 * D).toISOString(), welcome_code: null, welcome_code_expires_at: null, welcome_code_used_order_id: null },
        { email: "c@d.co", confirmed_at: new Date(base.getTime() - 2.5 * D).toISOString(), welcome_code: null, welcome_code_expires_at: null, welcome_code_used_order_id: null },
      ]);
      welcomeSendsFor.mockResolvedValue(new Map());
      sendTracked.mockImplementation(async () => { vi.advanceTimersByTime(250_000); return "sent"; });
      const { GET } = await import("@/app/api/cron/emails/route");
      const res = await GET(auth());
      expect(await res.json()).toMatchObject({ welcome: 1, cart: 0, failed: 1 });
      expect(listAbandonedCheckouts).not.toHaveBeenCalled();
      expect(alertOwner).toHaveBeenCalledTimes(1);
      expect(alertOwner.mock.calls[0][1]).toContain("run truncated: 1 remaining");
    } finally {
      vi.useRealTimers();
    }
  });
});
