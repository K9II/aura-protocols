import { describe, it, expect, vi, beforeEach } from "vitest";

const getCampaign = vi.fn(), pendingRecipients = vi.fn(), setRecipient = vi.fn(), recipientCounts = vi.fn(), moveCampaign = vi.fn(), codeForCampaign = vi.fn();
const sendTracked = vi.fn(), subscriberStatuses = vi.fn(), alertOwner = vi.fn();
vi.mock("@/lib/email/campaigns/data", () => ({ getCampaign, pendingRecipients, setRecipient, recipientCounts, moveCampaign, codeForCampaign }));
vi.mock("@/lib/email/data", () => ({ sendTracked, subscriberStatuses }));
vi.mock("@/lib/notify", () => ({ alertOwner }));
vi.mock("@/lib/supabase/env", () => ({ siteUrl: () => "https://auraprotocols.com" }));
const ensureEarlyCode = vi.fn(), ensureEarlyBatch = vi.fn(), earlyPriceCents = vi.fn(), syncEarlyBatchSize = vi.fn(), referralCodeIfSubscriber = vi.fn();
vi.mock("@/lib/early/data", () => ({ ensureEarlyCode, ensureEarlyBatch, earlyPriceCents, syncEarlyBatchSize }));
vi.mock("@/lib/waitlist/data", () => ({ referralCodeIfSubscriber }));

const campaign = { id: "k1", kind: "news", status: "sending", name: "How we read a spectrum", subject: "S", preview_text: "", content: { headline: "H", body: "B", buttonLabel: "", buttonPath: "" }, audience: "all", discount_code_id: null, lots_snapshot: [] };

describe("sendCampaignBatch", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const f of [getCampaign, pendingRecipients, setRecipient, recipientCounts, moveCampaign, codeForCampaign, sendTracked, subscriberStatuses, alertOwner]) f.mockReset();
    process.env.EMAIL_LINK_SECRET = "s"; process.env.MAILING_ADDRESS = "Aura Protocols LLC · 1 A St";
    getCampaign.mockResolvedValue(campaign);
    sendTracked.mockResolvedValue("sent");
    recipientCounts.mockResolvedValue({ pending: 0, sent: 2, skipped: 1, failed: 0 });
  });

  it("sends to confirmed recipients, skips the rest, and finishes when none are pending", async () => {
    pendingRecipients.mockResolvedValueOnce([{ email: "a@b.co", attempts: 0 }, { email: "c@d.co", attempts: 0 }, { email: "gone@x.co", attempts: 0 }]).mockResolvedValueOnce([]);
    subscriberStatuses.mockResolvedValue(new Map([["a@b.co", "confirmed"], ["c@d.co", "confirmed"], ["gone@x.co", "unsubscribed"]]));
    const { sendCampaignBatch } = await import("@/lib/email/campaigns/send");
    const r = await sendCampaignBatch("k1", Date.now() + 60_000);
    expect(r).toEqual({ sent: 2, skipped: 1, failed: 0, remaining: 0, finished: true, stopped: false });
    expect(sendTracked.mock.calls[0][0]).toMatchObject({ email: "a@b.co", kind: "campaign", ref: "k1" });
    expect(sendTracked.mock.calls[0][0].unsubscribeUrl).toContain("c=campaign.k1");
    expect(setRecipient).toHaveBeenCalledWith("k1", "gone@x.co", { state: "skipped" });
    expect(moveCampaign).toHaveBeenCalledWith("k1", "sending", "sent", null);
  });

  it("a failure stays pending with one more attempt; the third failure is final and alerts", async () => {
    pendingRecipients.mockResolvedValueOnce([{ email: "a@b.co", attempts: 0 }, { email: "c@d.co", attempts: 2 }]).mockResolvedValueOnce([]);
    subscriberStatuses.mockResolvedValue(new Map([["a@b.co", "confirmed"], ["c@d.co", "confirmed"]]));
    sendTracked.mockRejectedValue(new Error("SES throttled"));
    recipientCounts.mockResolvedValue({ pending: 1, sent: 0, skipped: 0, failed: 1 });
    const { sendCampaignBatch } = await import("@/lib/email/campaigns/send");
    const r = await sendCampaignBatch("k1", Date.now() + 60_000);
    expect(setRecipient).toHaveBeenCalledWith("k1", "a@b.co", { state: "pending", attempts: 1, last_error: "SES throttled" });
    expect(setRecipient).toHaveBeenCalledWith("k1", "c@d.co", { state: "failed", attempts: 3, last_error: "SES throttled" });
    expect(r).toMatchObject({ failed: 2, remaining: 1, finished: false });
    expect(alertOwner.mock.calls[0][0]).toBe("Campaign emails not sent");
    expect(alertOwner.mock.calls[0][1]).toContain('"How we read a spectrum": 2 not sent');
    expect(moveCampaign).not.toHaveBeenCalled();
  });

  it("a duplicate send counts as sent (they already have it)", async () => {
    pendingRecipients.mockResolvedValueOnce([{ email: "a@b.co", attempts: 0 }]).mockResolvedValueOnce([]);
    subscriberStatuses.mockResolvedValue(new Map([["a@b.co", "confirmed"]]));
    sendTracked.mockResolvedValue("duplicate");
    const { sendCampaignBatch } = await import("@/lib/email/campaigns/send");
    await sendCampaignBatch("k1", Date.now() + 60_000);
    expect(setRecipient).toHaveBeenCalledWith("k1", "a@b.co", { state: "sent" });
  });

  it("stops at the deadline and leaves the rest pending", async () => {
    pendingRecipients.mockResolvedValueOnce([{ email: "a@b.co", attempts: 0 }]);
    subscriberStatuses.mockResolvedValue(new Map([["a@b.co", "confirmed"]]));
    recipientCounts.mockResolvedValue({ pending: 1, sent: 0, skipped: 0, failed: 0 });
    const { sendCampaignBatch } = await import("@/lib/email/campaigns/send");
    const r = await sendCampaignBatch("k1", Date.now() - 1);
    expect(sendTracked).not.toHaveBeenCalled();
    expect(r).toMatchObject({ sent: 0, remaining: 1, finished: false });
  });

  it("does nothing for a campaign that isn't sending (stopped mid-way)", async () => {
    getCampaign.mockResolvedValue({ ...campaign, status: "stopped" });
    const { sendCampaignBatch } = await import("@/lib/email/campaigns/send");
    expect(await sendCampaignBatch("k1", Date.now() + 60_000)).toEqual({ sent: 0, skipped: 0, failed: 0, remaining: 0, finished: false, stopped: true });
  });

  it("re-checks for a stop between batches", async () => {
    getCampaign.mockResolvedValueOnce(campaign).mockResolvedValueOnce({ ...campaign, status: "stopped" });
    pendingRecipients.mockResolvedValueOnce([{ email: "a@b.co", attempts: 0 }]).mockResolvedValueOnce([{ email: "z@b.co", attempts: 0 }]);
    subscriberStatuses.mockResolvedValue(new Map([["a@b.co", "confirmed"], ["z@b.co", "confirmed"]]));
    const { sendCampaignBatch } = await import("@/lib/email/campaigns/send");
    const r = await sendCampaignBatch("k1", Date.now() + 60_000);
    expect(sendTracked).toHaveBeenCalledTimes(1);
    expect(r.stopped).toBe(true);
  });

  it("a promotion with a missing code alerts and doesn't send", async () => {
    getCampaign.mockResolvedValue({ ...campaign, kind: "promotion", discount_code_id: "c1" });
    codeForCampaign.mockResolvedValue(null);
    const { sendCampaignBatch } = await import("@/lib/email/campaigns/send");
    await expect(sendCampaignBatch("k1", Date.now() + 60_000)).rejects.toThrow(/code/);
    expect(sendTracked).not.toHaveBeenCalled();
  });

  it("a config error in the preflight render throws before any recipient is attempted", async () => {
    delete process.env.MAILING_ADDRESS;
    pendingRecipients.mockResolvedValueOnce([{ email: "a@b.co", attempts: 0 }]);
    const { sendCampaignBatch } = await import("@/lib/email/campaigns/send");
    await expect(sendCampaignBatch("k1", Date.now() + 60_000)).rejects.toThrow(/MAILING_ADDRESS/);
    expect(pendingRecipients).not.toHaveBeenCalled();
    expect(sendTracked).not.toHaveBeenCalled();
  });

  it("a compliance violation in the preflight render throws before any recipient is attempted", async () => {
    getCampaign.mockResolvedValue({ ...campaign, content: { ...campaign.content, body: "Follow this dosing schedule." } });
    pendingRecipients.mockResolvedValueOnce([{ email: "a@b.co", attempts: 0 }]);
    const { sendCampaignBatch } = await import("@/lib/email/campaigns/send");
    await expect(sendCampaignBatch("k1", Date.now() + 60_000)).rejects.toThrow(/compliance/);
    expect(pendingRecipients).not.toHaveBeenCalled();
    expect(sendTracked).not.toHaveBeenCalled();
  });

  it("trips the circuit breaker after 5 consecutive failures and leaves the rest alone", async () => {
    const recipients = Array.from({ length: 8 }, (_, i) => ({ email: `u${i}@b.co`, attempts: 0 }));
    pendingRecipients.mockResolvedValueOnce(recipients);
    subscriberStatuses.mockResolvedValue(new Map(recipients.map((r) => [r.email, "confirmed"])));
    sendTracked.mockRejectedValue(new Error("SES down"));
    recipientCounts.mockResolvedValue({ pending: 8, sent: 0, skipped: 0, failed: 0 });
    const { sendCampaignBatch } = await import("@/lib/email/campaigns/send");
    const r = await sendCampaignBatch("k1", Date.now() + 60_000);
    expect(sendTracked).toHaveBeenCalledTimes(5);
    expect(setRecipient).toHaveBeenCalledTimes(5);
    expect(r).toMatchObject({ sent: 0, failed: 5, remaining: 8, finished: false, stopped: false });
    expect(moveCampaign).not.toHaveBeenCalled();
    expect(alertOwner).toHaveBeenCalledTimes(1);
    expect(alertOwner.mock.calls[0][0]).toBe("Campaign stopped after repeated send failures");
    expect(alertOwner.mock.calls[0][1]).toContain("5 failures in a row");
  });

  it("re-checks for a stop every 20 recipients within one batch, not only between batches", async () => {
    const recipients = Array.from({ length: 25 }, (_, i) => ({ email: `u${i}@b.co`, attempts: 0 }));
    pendingRecipients.mockResolvedValueOnce(recipients);
    subscriberStatuses.mockResolvedValue(new Map(recipients.map((r) => [r.email, "confirmed"])));
    getCampaign.mockResolvedValueOnce(campaign).mockResolvedValueOnce({ ...campaign, status: "stopped" });
    const { sendCampaignBatch } = await import("@/lib/email/campaigns/send");
    const r = await sendCampaignBatch("k1", Date.now() + 60_000);
    expect(sendTracked).toHaveBeenCalledTimes(20);
    expect(r.stopped).toBe(true);
  });

  it("alerts the owner when the campaign finishes with some failed, but still marks it sent", async () => {
    pendingRecipients.mockResolvedValueOnce([]);
    recipientCounts.mockResolvedValue({ pending: 0, sent: 3, skipped: 0, failed: 2 });
    const { sendCampaignBatch } = await import("@/lib/email/campaigns/send");
    const r = await sendCampaignBatch("k1", Date.now() + 60_000);
    expect(moveCampaign).toHaveBeenCalledWith("k1", "sending", "sent", null);
    expect(r.finished).toBe(true);
    expect(alertOwner).toHaveBeenCalledWith("Campaign finished with failures", expect.stringContaining("2 failed"));
  });

  it("stops a campaign when everything failed, instead of leaving it stuck sending", async () => {
    pendingRecipients.mockResolvedValueOnce([]);
    recipientCounts.mockResolvedValue({ pending: 0, sent: 0, skipped: 0, failed: 4 });
    const { sendCampaignBatch } = await import("@/lib/email/campaigns/send");
    const r = await sendCampaignBatch("k1", Date.now() + 60_000);
    expect(moveCampaign).toHaveBeenCalledWith("k1", "sending", "stopped", null);
    expect(r.finished).toBe(false);
    expect(r.stopped).toBe(true);
    expect(alertOwner).toHaveBeenCalledWith("Campaign stopped — nothing was delivered", expect.stringContaining("4 failed"));
  });

  it("resets the failure streak after a success, so a mix of failures never trips the breaker", async () => {
    const recipients = Array.from({ length: 9 }, (_, i) => ({ email: `u${i}@b.co`, attempts: 0 }));
    pendingRecipients.mockResolvedValueOnce(recipients).mockResolvedValueOnce([]);
    subscriberStatuses.mockResolvedValue(new Map(recipients.map((r) => [r.email, "confirmed"])));
    const outcomes = [false, false, false, false, true, false, false, false, false]; // fail x4, succeed, fail x4
    let i = 0;
    sendTracked.mockImplementation(async () => {
      const ok = outcomes[i++];
      if (!ok) throw new Error("SES hiccup");
      return "sent";
    });
    recipientCounts.mockResolvedValue({ pending: 0, sent: 1, skipped: 0, failed: 8 });
    const { sendCampaignBatch } = await import("@/lib/email/campaigns/send");
    const r = await sendCampaignBatch("k1", Date.now() + 60_000);
    expect(sendTracked).toHaveBeenCalledTimes(9);
    expect(r.finished).toBe(true);
    expect(moveCampaign).toHaveBeenCalledWith("k1", "sending", "sent", null);
  });

  describe("early access", () => {
    const early = { ...campaign, kind: "early_access", name: "Pre-launch · Early access", audience: "waitlist", content: { headline: "", body: "", buttonLabel: "", buttonPath: "", openingOn: "2026-12-01" } };
    beforeEach(() => {
      for (const f of [ensureEarlyCode, ensureEarlyBatch, earlyPriceCents, syncEarlyBatchSize, referralCodeIfSubscriber]) f.mockReset();
      getCampaign.mockResolvedValue(early);
      ensureEarlyBatch.mockResolvedValue("b1");
      earlyPriceCents.mockResolvedValue(17500);
      ensureEarlyCode.mockImplementation(async (email: string) => (email === "a@b.co" ? { ref: "AAAAAA", code: "EARLY-AAAAAA" } : { ref: "CCCCCC", code: "EARLY-CCCCCC" }));
    });

    it("each recipient gets their own code and link, made before their email; the batch size is synced", async () => {
      pendingRecipients.mockResolvedValueOnce([{ email: "a@b.co", attempts: 0 }, { email: "c@d.co", attempts: 0 }]).mockResolvedValueOnce([]);
      subscriberStatuses.mockResolvedValue(new Map([["a@b.co", "confirmed"], ["c@d.co", "confirmed"]]));
      const { sendCampaignBatch } = await import("@/lib/email/campaigns/send");
      await sendCampaignBatch("k1", Date.now() + 60_000);
      expect(ensureEarlyCode.mock.calls.map((c) => c.slice(0, 3))).toEqual([["a@b.co", "2026-12-01", "b1"], ["c@d.co", "2026-12-01", "b1"]]);
      const [a, c] = sendTracked.mock.calls.map((x) => x[0].msg.html as string);
      expect(a).toContain("EARLY-AAAAAA");
      expect(a).toContain("https://auraprotocols.com/early?t=AAAAAA.");
      expect(a).not.toContain("CCCCCC");
      expect(c).toContain("EARLY-CCCCCC");
      expect(a).toContain("Tuesday, December 1");
      expect(a).toContain("$131.25");
      expect(syncEarlyBatchSize).toHaveBeenCalledWith("b1");
    });

    it("no opening date: throws before anyone is tried", async () => {
      getCampaign.mockResolvedValue({ ...early, content: { ...early.content, openingOn: undefined } });
      const { sendCampaignBatch } = await import("@/lib/email/campaigns/send");
      await expect(sendCampaignBatch("k1", Date.now() + 60_000)).rejects.toThrow(/no opening date/);
      expect(pendingRecipients).not.toHaveBeenCalled();
    });

    it("a code that can't be made is that person's failure, retried later", async () => {
      pendingRecipients.mockResolvedValueOnce([{ email: "a@b.co", attempts: 0 }]).mockResolvedValueOnce([]);
      subscriberStatuses.mockResolvedValue(new Map([["a@b.co", "confirmed"]]));
      ensureEarlyCode.mockRejectedValue(new Error("early code EARLY-AAAAAA failed"));
      recipientCounts.mockResolvedValue({ pending: 1, sent: 0, skipped: 0, failed: 0 });
      const { sendCampaignBatch } = await import("@/lib/email/campaigns/send");
      await sendCampaignBatch("k1", Date.now() + 60_000);
      expect(sendTracked).not.toHaveBeenCalled();
      expect(setRecipient).toHaveBeenCalledWith("k1", "a@b.co", { state: "pending", attempts: 1, last_error: "early code EARLY-AAAAAA failed" });
    });

    it("a test send uses the owner's own code when they're a subscriber, else a sample", async () => {
      const { renderFor } = await import("@/lib/email/campaigns/send");
      const run = { openingOn: "2026-12-01", priceCents: 17500, batchId: "b1" };
      referralCodeIfSubscriber.mockResolvedValueOnce("OWNERX").mockResolvedValueOnce(null);
      ensureEarlyCode.mockResolvedValue({ ref: "OWNERX", code: "EARLY-OWNERX" });
      const own = await renderFor(early as never, "owner@auraprotocols.com", null, { test: true }, run);
      expect(own.msg.html).toContain("EARLY-OWNERX");
      expect(own.msg.subject).toBe("[Test] Your early access is open");
      const sample = await renderFor(early as never, "someone@x.co", null, { test: true }, run);
      expect(sample.msg.html).toContain("EARLY-XXXXXX");
      expect(sample.msg.html).toContain('href="https://auraprotocols.com/early"');
    });
  });
});
