import { describe, it, expect, vi, beforeEach } from "vitest";

const listWelcomeCandidates = vi.fn(), sentKinds = vi.fn(), sendTracked = vi.fn(), getSubscriber = vi.fn(), welcomeSendsFor = vi.fn();
const listAbandonedCheckouts = vi.fn(), alertOwner = vi.fn(), getOrderById = vi.fn();
const offerForEmail = vi.fn();
const markSkipped = vi.fn();
vi.mock("@/lib/email/data", () => ({ listWelcomeCandidates, sentKinds, sendTracked, getSubscriber, welcomeSendsFor, markSkipped }));
vi.mock("@/lib/email/cart", () => ({ listAbandonedCheckouts }));
vi.mock("@/lib/orders", () => ({ getOrderById }));
vi.mock("@/lib/notify", () => ({ alertOwner }));
vi.mock("@/lib/supabase/env", () => ({ siteUrl: () => "https://auraprotocols.com" }));
const getLiveCatalog = vi.fn();
vi.mock("@/lib/catalog-live", () => ({ getLiveCatalog }));
vi.mock("@/lib/account/offer-data", () => ({ offerForEmail }));
const getEmailSettings = vi.fn(), startRun = vi.fn(), finishRun = vi.fn();
vi.mock("@/lib/email/admin-data", () => ({ getEmailSettings, startRun, finishRun }));
const campaignsToRun = vi.fn(), startCampaign = vi.fn();
vi.mock("@/lib/email/campaigns/data", () => ({ campaignsToRun, startCampaign }));
const sendCampaignBatch = vi.fn();
vi.mock("@/lib/email/campaigns/send", () => ({ sendCampaignBatch }));
const checksFor = vi.fn();
vi.mock("@/lib/email/campaigns/checks-server", () => ({ checksFor }));

const auth = (s = "cron-s") => new Request("http://localhost/api/cron/emails", { headers: { authorization: `Bearer ${s}` } });
const H = 3600 * 1000, D = 24 * H;

describe("GET /api/cron/emails", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const f of [
      listWelcomeCandidates, sentKinds, sendTracked, getSubscriber, listAbandonedCheckouts, alertOwner, welcomeSendsFor, getOrderById, offerForEmail, getLiveCatalog,
      markSkipped, getEmailSettings, startRun, finishRun, campaignsToRun, startCampaign, sendCampaignBatch, checksFor,
    ]) f.mockReset();
    getLiveCatalog.mockResolvedValue({ all: [], shown: [], lots: [] });
    welcomeSendsFor.mockResolvedValue(new Map());
    getOrderById.mockResolvedValue({ status: "awaiting_payment" });
    offerForEmail.mockResolvedValue(null);
    process.env.CRON_SECRET = "cron-s"; process.env.EMAIL_LINK_SECRET = "s"; process.env.MAILING_ADDRESS = "Aura Protocols LLC · 1 A St";
    listWelcomeCandidates.mockResolvedValue([]); listAbandonedCheckouts.mockResolvedValue([]); sendTracked.mockResolvedValue("sent");
    getEmailSettings.mockResolvedValue({ welcomePaused: false, cartPaused: false });
    startRun.mockResolvedValue("run1"); finishRun.mockResolvedValue(undefined);
    campaignsToRun.mockResolvedValue([]); markSkipped.mockResolvedValue(true);
    checksFor.mockResolvedValue([]);
  });

  it("401s without the cron secret", async () => {
    const { GET } = await import("@/app/api/cron/emails/route");
    expect((await GET(auth("wrong"))).status).toBe(401);
  });

  it("sends the next due welcome file", async () => {
    listWelcomeCandidates.mockResolvedValue([{ email: "a@b.co", confirmed_at: new Date(Date.now() - 5.5 * D).toISOString() }]);
    welcomeSendsFor.mockResolvedValue(new Map([["a@b.co", { kinds: new Set(["welcome_1", "welcome_2"]), lastSentMs: null }]]));
    const { GET } = await import("@/app/api/cron/emails/route");
    const res = await GET(auth());
    expect(await res.json()).toMatchObject({ welcome: 1, cart: 0, failed: 0 });
    expect(sendTracked.mock.calls[0][0]).toMatchObject({ email: "a@b.co", kind: "welcome_3", ref: null });
  });

  it("puts the live new-account offer in File 01 and asks only for Files 01 and 05", async () => {
    listWelcomeCandidates.mockResolvedValue([{ email: "a@b.co", confirmed_at: new Date().toISOString() }]);
    offerForEmail.mockResolvedValue({ endsAt: "2026-12-15T23:59:59.999Z" });
    const { GET } = await import("@/app/api/cron/emails/route");
    await GET(auth());
    expect(sendTracked.mock.calls[0][0].msg.html).toContain("FIRST ORDER · 15%");
    expect(offerForEmail).toHaveBeenCalledWith("a@b.co");
  });

  it("doesn't look up the offer for Files 02–04", async () => {
    listWelcomeCandidates.mockResolvedValue([{ email: "a@b.co", confirmed_at: new Date(Date.now() - 5.5 * D).toISOString() }]);
    welcomeSendsFor.mockResolvedValue(new Map([["a@b.co", { kinds: new Set(["welcome_1", "welcome_2"]), lastSentMs: null }]]));
    const { GET } = await import("@/app/api/cron/emails/route");
    await GET(auth());
    expect(offerForEmail).not.toHaveBeenCalled();
  });

  it("sends the due cart reminder to a subscribed-or-unknown buyer, keyed by order id", async () => {
    listAbandonedCheckouts.mockResolvedValue([{ id: "o1", order_number: "AP-1042", email: "a@b.co", created_at: new Date(Date.now() - 2 * H).toISOString(), order_items: [] }]);
    sentKinds.mockResolvedValue(new Set());
    getSubscriber.mockResolvedValue(null);
    const { GET } = await import("@/app/api/cron/emails/route");
    await GET(auth());
    expect(sendTracked.mock.calls[0][0]).toMatchObject({ email: "a@b.co", kind: "cart_1", ref: "o1" });
  });

  it("links the certificate of the lot selling now, else the last sold-out one, never a retired lot", async () => {
    const pl = (lot: string, slug: string, status: string) => ({ lot, slug, status, coaFile: `https://b/coa/${lot}.pdf`, compoundName: slug, variantId: "10mg", strength: "10 mg", purityPct: 99, method: "HPLC", testedOn: "2026-09-01", liveAt: "2026-09-02T00:00:00Z", onStore: true });
    getLiveCatalog.mockResolvedValue({ all: [], shown: [], lots: [
      pl("BPC-OLD", "bpc-157", "sold_out"), pl("BPC-NOW", "bpc-157", "live"),
      pl("TB-RET", "tb-500", "retired"), pl("TB-SOLD", "tb-500", "sold_out"),
      pl("KPV-RET", "kpv", "retired"),
    ] });
    const item = (slug: string) => ({ compound_name: slug, strength: "10 mg", pack_qty: 2, quantity: 1, lot_number: "x", compound_slug: slug, variant_id: "10mg" });
    listAbandonedCheckouts.mockResolvedValue([{ id: "o1", order_number: "AP-1042", email: "a@b.co", created_at: new Date(Date.now() - 13 * H).toISOString(), order_items: [item("bpc-157"), item("tb-500"), item("kpv")] }]);
    sentKinds.mockResolvedValue(new Set(["cart_1:o1"]));
    getSubscriber.mockResolvedValue(null);
    const { GET } = await import("@/app/api/cron/emails/route");
    await GET(auth());
    const html: string = sendTracked.mock.calls[0][0].msg.html;
    expect(sendTracked.mock.calls[0][0].kind).toBe("cart_2");
    expect(html).toContain("https://b/coa/BPC-NOW.pdf");
    expect(html).not.toContain("BPC-OLD");
    expect(html).toContain("https://b/coa/TB-SOLD.pdf");
    expect(html).not.toContain("RET.pdf");
  });

  it("links each strength's own certificate on a two-strength product", async () => {
    const pl = (lot: string, variantId: string, status: string) => ({ lot, slug: "ss-31", status, coaFile: `https://b/coa/${lot}.pdf`, compoundName: "SS-31", variantId, strength: variantId.replace("mg", " mg"), purityPct: 99, method: "HPLC", testedOn: "2026-09-01", liveAt: "2026-09-02T00:00:00Z", onStore: true });
    getLiveCatalog.mockResolvedValue({ all: [], shown: [], lots: [pl("SS-10-LIVE", "10mg", "live"), pl("SS-50-LIVE", "50mg", "live")] });
    const item = (variantId: string) => ({ compound_name: "SS-31", strength: variantId.replace("mg", " mg"), pack_qty: 2, quantity: 1, lot_number: "x", compound_slug: "ss-31", variant_id: variantId });
    listAbandonedCheckouts.mockResolvedValue([{ id: "o1", order_number: "AP-1042", email: "a@b.co", created_at: new Date(Date.now() - 13 * H).toISOString(), order_items: [item("50mg")] }]);
    sentKinds.mockResolvedValue(new Set(["cart_1:o1"]));
    getSubscriber.mockResolvedValue(null);
    const { GET } = await import("@/app/api/cron/emails/route");
    await GET(auth());
    const html: string = sendTracked.mock.calls[0][0].msg.html;
    expect(html).toContain("https://b/coa/SS-50-LIVE.pdf");
    expect(html).not.toContain("SS-10-LIVE");
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
      { email: "a@b.co", confirmed_at: new Date(Date.now() - 2.5 * D).toISOString() },
      { email: "c@d.co", confirmed_at: new Date(Date.now() - 2.5 * D).toISOString() },
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
    listWelcomeCandidates.mockResolvedValue([{ email: "a@b.co", confirmed_at: new Date(Date.now() - 2.5 * D).toISOString() }]);
    welcomeSendsFor.mockResolvedValue(new Map());
    listAbandonedCheckouts.mockRejectedValue(new Error("db down"));
    const { GET } = await import("@/app/api/cron/emails/route");
    const res = await GET(auth());
    expect(await res.json()).toMatchObject({ welcome: 1, cart: 0, failed: 1 });
    expect(alertOwner).toHaveBeenCalledTimes(1);
    expect(alertOwner.mock.calls[0][1]).toContain("cart list:");
  });

  it("skips the cart list (but still sends welcome files) when the live catalog can't be read, with one alert", async () => {
    listWelcomeCandidates.mockResolvedValue([{ email: "a@b.co", confirmed_at: new Date(Date.now() - 2.5 * D).toISOString() }]);
    getLiveCatalog.mockRejectedValue(new Error("catalog down"));
    const { GET } = await import("@/app/api/cron/emails/route");
    const res = await GET(auth());
    expect(await res.json()).toMatchObject({ welcome: 1, cart: 0, failed: 1 });
    expect(listAbandonedCheckouts).not.toHaveBeenCalled();
    expect(alertOwner.mock.calls[0][1]).toContain("live catalog: catalog down");
  });

  it("stops before the 240s deadline and reports how many are left, without starting the cart loop", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      const base = new Date("2026-12-01T00:00:00Z");
      vi.setSystemTime(base);
      listWelcomeCandidates.mockResolvedValue([
        { email: "a@b.co", confirmed_at: new Date(base.getTime() - 2.5 * D).toISOString() },
        { email: "c@d.co", confirmed_at: new Date(base.getTime() - 2.5 * D).toISOString() },
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

  it("records the run with its counts", async () => {
    listWelcomeCandidates.mockResolvedValue([{ email: "a@b.co", confirmed_at: new Date().toISOString() }]);
    const { GET } = await import("@/app/api/cron/emails/route");
    await GET(auth());
    expect(startRun).toHaveBeenCalled();
    expect(finishRun).toHaveBeenCalledWith("run1", { welcome: 1, cart: 0, cartSkipped: 0, campaign: 0, failures: [] });
  });

  it("a paused welcome series sends nothing", async () => {
    getEmailSettings.mockResolvedValue({ welcomePaused: true, cartPaused: false });
    listWelcomeCandidates.mockResolvedValue([{ email: "a@b.co", confirmed_at: new Date().toISOString() }]);
    const { GET } = await import("@/app/api/cron/emails/route");
    expect(await (await GET(auth())).json()).toMatchObject({ welcome: 0 });
    expect(listWelcomeCandidates).not.toHaveBeenCalled();
  });

  it("paused cart reminders: a due reminder is marked skipped, not sent", async () => {
    getEmailSettings.mockResolvedValue({ welcomePaused: false, cartPaused: true });
    listAbandonedCheckouts.mockResolvedValue([{ id: "o1", order_number: "AP-1", email: "a@b.co", created_at: new Date(Date.now() - 2 * H).toISOString(), order_items: [] }]);
    getSubscriber.mockResolvedValue(null); sentKinds.mockResolvedValue(new Set());
    const { GET } = await import("@/app/api/cron/emails/route");
    const body = await (await GET(auth())).json();
    expect(markSkipped).toHaveBeenCalledWith("a@b.co", "cart_1", "o1");
    expect(sendTracked).not.toHaveBeenCalled();
    expect(body).toMatchObject({ cart: 0, cartSkipped: 1 });
  });

  it("starts a due scheduled campaign and sends a batch", async () => {
    campaignsToRun.mockResolvedValue([{ id: "k1", status: "scheduled", name: "Oct" }]);
    startCampaign.mockResolvedValue({ ok: true, recipients: 3 });
    sendCampaignBatch.mockResolvedValue({ sent: 3, skipped: 0, failed: 0, remaining: 0, finished: true, stopped: false });
    const { GET } = await import("@/app/api/cron/emails/route");
    const body = await (await GET(auth())).json();
    expect(startCampaign).toHaveBeenCalledWith("k1", null, "scheduled");
    expect(sendCampaignBatch).toHaveBeenCalledWith("k1", expect.any(Number));
    expect(body).toMatchObject({ campaign: 3 });
  });

  it("continues a sending campaign without starting it again", async () => {
    campaignsToRun.mockResolvedValue([{ id: "k1", status: "sending", name: "Oct" }]);
    sendCampaignBatch.mockResolvedValue({ sent: 5, skipped: 0, failed: 0, remaining: 10, finished: false, stopped: false });
    const { GET } = await import("@/app/api/cron/emails/route");
    await GET(auth());
    expect(startCampaign).not.toHaveBeenCalled();
  });

  it("a scheduled campaign that now fails its checks isn't started, and the owner is alerted", async () => {
    campaignsToRun.mockResolvedValue([{ id: "k3", status: "scheduled", name: "Oct promo" }]);
    checksFor.mockResolvedValue([{ level: "block", field: "discountCodeId", text: "OCT10 is paused. Resume it in Discounts first." }]);
    const { GET } = await import("@/app/api/cron/emails/route");
    await GET(auth());
    expect(startCampaign).not.toHaveBeenCalled();
    expect(alertOwner.mock.calls[0][1]).toContain('campaign "Oct promo": checks failed — not sent (OCT10 is paused. Resume it in Discounts first.)');
  });

  it("a busy campaign waits for the next run; a failing settings read alerts and skips automations", async () => {
    getEmailSettings.mockRejectedValue(new Error("db down"));
    campaignsToRun.mockResolvedValue([{ id: "k2", status: "scheduled", name: "B" }]);
    startCampaign.mockResolvedValue({ ok: false, reason: "busy" });
    const { GET } = await import("@/app/api/cron/emails/route");
    await GET(auth());
    expect(listWelcomeCandidates).not.toHaveBeenCalled();
    expect(sendCampaignBatch).not.toHaveBeenCalled();
    expect(alertOwner.mock.calls[0][1]).toContain("email settings: db down");
  });

  it("one campaign throwing doesn't stop the rest of the run: it's recorded once, in the summary alert, and the next due campaign still sends", async () => {
    campaignsToRun.mockResolvedValue([
      { id: "k1", status: "sending", name: "Broken" },
      { id: "k2", status: "scheduled", name: "Good" },
    ]);
    startCampaign.mockResolvedValue({ ok: true, recipients: 2 });
    sendCampaignBatch.mockImplementation(async (id: string) => {
      if (id === "k1") throw new Error("SES down");
      return { sent: 2, skipped: 0, failed: 0, remaining: 0, finished: true, stopped: false };
    });
    const { GET } = await import("@/app/api/cron/emails/route");
    const body = await (await GET(auth())).json();
    expect(startCampaign).toHaveBeenCalledWith("k2", null, "scheduled");
    expect(body).toMatchObject({ campaign: 2, failed: 1 });
    expect(alertOwner).toHaveBeenCalledTimes(1);
    expect(alertOwner.mock.calls[0][1]).toContain('campaign "Broken": SES down');
  });

  it("checksFor throwing for one scheduled campaign doesn't stop the next due campaign from starting", async () => {
    campaignsToRun.mockResolvedValue([
      { id: "k1", status: "scheduled", name: "Bad" },
      { id: "k2", status: "scheduled", name: "Good" },
    ]);
    checksFor.mockImplementation(async (c: { id: string }) => {
      if (c.id === "k1") throw new Error("checks db down");
      return [];
    });
    startCampaign.mockResolvedValue({ ok: true, recipients: 2 });
    sendCampaignBatch.mockResolvedValue({ sent: 2, skipped: 0, failed: 0, remaining: 0, finished: true, stopped: false });
    const { GET } = await import("@/app/api/cron/emails/route");
    const body = await (await GET(auth())).json();
    expect(startCampaign).toHaveBeenCalledTimes(1);
    expect(startCampaign).toHaveBeenCalledWith("k2", null, "scheduled");
    expect(body).toMatchObject({ campaign: 2, failed: 1 });
    expect(alertOwner).toHaveBeenCalledTimes(1);
    expect(alertOwner.mock.calls[0][1]).toContain('campaign "Bad": checks db down');
  });
});
