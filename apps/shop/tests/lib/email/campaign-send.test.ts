import { describe, it, expect, vi, beforeEach } from "vitest";

const getCampaign = vi.fn(), pendingRecipients = vi.fn(), setRecipient = vi.fn(), recipientCounts = vi.fn(), moveCampaign = vi.fn(), codeForCampaign = vi.fn();
const sendTracked = vi.fn(), subscriberStatuses = vi.fn(), alertOwner = vi.fn();
vi.mock("@/lib/email/campaigns/data", () => ({ getCampaign, pendingRecipients, setRecipient, recipientCounts, moveCampaign, codeForCampaign }));
vi.mock("@/lib/email/data", () => ({ sendTracked, subscriberStatuses }));
vi.mock("@/lib/notify", () => ({ alertOwner }));
vi.mock("@/lib/supabase/env", () => ({ siteUrl: () => "https://auraprotocols.com" }));

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
    expect(alertOwner.mock.calls[0][0]).toBe('Campaign "How we read a spectrum": 2 not sent');
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
    const { sendCampaignBatch } = await import("@/lib/email/campaigns/send");
    const r = await sendCampaignBatch("k1", Date.now() + 60_000);
    expect(sendTracked).toHaveBeenCalledTimes(5);
    expect(setRecipient).toHaveBeenCalledTimes(5);
    expect(r).toMatchObject({ sent: 0, failed: 5, finished: false, stopped: false });
    expect(moveCampaign).not.toHaveBeenCalled();
    expect(recipientCounts).not.toHaveBeenCalled();
    expect(alertOwner).toHaveBeenCalledTimes(1);
    expect(alertOwner.mock.calls[0][0]).toContain("5 failures in a row");
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
    expect(alertOwner).toHaveBeenCalledWith(expect.stringContaining("2 failed"), expect.any(String));
  });

  it("does not mark a campaign sent when everything failed", async () => {
    pendingRecipients.mockResolvedValueOnce([]);
    recipientCounts.mockResolvedValue({ pending: 0, sent: 0, skipped: 0, failed: 4 });
    const { sendCampaignBatch } = await import("@/lib/email/campaigns/send");
    const r = await sendCampaignBatch("k1", Date.now() + 60_000);
    expect(moveCampaign).not.toHaveBeenCalled();
    expect(r.finished).toBe(false);
    expect(alertOwner).toHaveBeenCalledWith(expect.stringContaining("0 sent"), expect.any(String));
  });
});
