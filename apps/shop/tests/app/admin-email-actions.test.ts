import { describe, it, expect, vi, beforeEach } from "vitest";

const requireOwner = vi.fn();
vi.mock("@/lib/dal", () => ({ requireOwner }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const redirect = vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`); });
vi.mock("next/navigation", () => ({ redirect }));
const data = {
  getCampaign: vi.fn(), createCampaign: vi.fn(), updateDraft: vi.fn(), moveCampaign: vi.fn(), startCampaign: vi.fn(),
  lotChoices: vi.fn(), waitingLots: vi.fn(), codeForCampaign: vi.fn(),
};
vi.mock("@/lib/email/campaigns/data", () => data);
const sendCampaignBatch = vi.fn(), renderFor = vi.fn(), campaignCode = vi.fn();
vi.mock("@/lib/email/campaigns/send", () => ({ sendCampaignBatch, renderFor, campaignCode }));
const audienceCounts = vi.fn();
vi.mock("@/lib/email/stats", () => ({ audienceCounts }));
const sendTracked = vi.fn();
vi.mock("@/lib/email/data", () => ({ sendTracked }));
const setAutomationPaused = vi.fn(), logEmailAdminEvent = vi.fn();
vi.mock("@/lib/email/admin-data", () => ({ setAutomationPaused, logEmailAdminEvent, AUTOMATION_LABEL: { welcome: "Welcome series", cart: "Cart reminders" } }));
const alertOwner = vi.fn();
vi.mock("@/lib/notify", () => ({ alertOwner }));
import { isoToZonedLocal } from "@/lib/discounts/time";
// A valid schedule time: two days from now, on the hour, as Mountain local time.
const soonLocal = () => isoToZonedLocal(new Date(Math.ceil((Date.now() + 2 * 86_400_000) / 3_600_000) * 3_600_000).toISOString());

const K = "0b6f1c2e-1111-4222-8333-944455556666";
const draft = { id: K, kind: "news", status: "draft", name: "N", subject: "S", preview_text: "", content: { headline: "H", body: "Fine.", buttonLabel: "", buttonPath: "" }, audience: "all", discount_code_id: null, lots_snapshot: [] };
const fd = (o: Record<string, string | string[]>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) (Array.isArray(v) ? v : [v]).forEach((x) => f.append(k, x)); return f; };
const form = { name: "N", subject: "S", previewText: "", headline: "H", body: "Fine.", buttonLabel: "", buttonPath: "", audience: "all" };

describe("admin email actions", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const f of [...Object.values(data), sendCampaignBatch, renderFor, campaignCode, audienceCounts, sendTracked, setAutomationPaused, logEmailAdminEvent, requireOwner, alertOwner]) f.mockReset();
    requireOwner.mockResolvedValue({ id: "owner1", email: "owner@auraprotocols.com" });
    data.getCampaign.mockResolvedValue(draft);
    data.lotChoices.mockResolvedValue([]);
    audienceCounts.mockResolvedValue({ all: 2310, ordered: 486, never_ordered: 1824 });
    campaignCode.mockResolvedValue(null);
    renderFor.mockResolvedValue({ msg: { subject: "[Test] S", html: "<p>x</p>" }, unsub: "u" });
  });

  it("every action is owner-only", async () => {
    requireOwner.mockRejectedValue(new Error("NOT_FOUND"));
    const a = await import("@/app/admin/email/actions");
    await expect(a.saveCampaignAction(null, fd({ ...form, kind: "news" }))).rejects.toThrow("NOT_FOUND");
    await expect(a.sendNowAction(null, fd({ id: K, from: "draft" }))).rejects.toThrow("NOT_FOUND");
    await expect(a.setAutomationAction(null, fd({ automation: "cart", paused: "1" }))).rejects.toThrow("NOT_FOUND");
  });

  it("save: a new campaign is created and opened", async () => {
    data.createCampaign.mockResolvedValue(K);
    const { saveCampaignAction } = await import("@/app/admin/email/actions");
    await expect(saveCampaignAction(null, fd({ ...form, kind: "news" }))).rejects.toThrow(`REDIRECT:/admin/email/campaigns/${K}`);
    expect(data.createCampaign).toHaveBeenCalledWith("news", expect.objectContaining({ name: "N", subject: "S" }), [], "owner1");
  });

  it("save: field errors come back; an existing draft is updated and its checks returned", async () => {
    const { saveCampaignAction } = await import("@/app/admin/email/actions");
    expect(await saveCampaignAction(null, fd({ ...form, kind: "news", subject: "" }))).toMatchObject({ fieldErrors: { subject: "Write a subject line." } });
    // first read = the draft before saving; second = the saved row the checks run on
    data.getCampaign.mockResolvedValueOnce(draft).mockResolvedValueOnce({ ...draft, content: { ...draft.content, body: "for your stack" } });
    const r = await saveCampaignAction(null, fd({ ...form, id: K, body: "for your stack" }));
    expect(data.updateDraft).toHaveBeenCalled();
    expect(r?.checks?.[0]).toMatchObject({ level: "block", field: "body" });
  });

  it("save: new lots keep only lots that are still choosable", async () => {
    const lot = { compoundName: "BPC-157", slug: "bpc-157", strengths: "10 mg", lot: "AP-1", purityPct: 99.4, method: "HPLC+MS", testedOn: "2026-10-02", coaFile: "/coa/AP-1.pdf" };
    data.getCampaign.mockResolvedValue({ ...draft, kind: "new_lots" });
    data.lotChoices.mockResolvedValue([lot]);
    const { saveCampaignAction } = await import("@/app/admin/email/actions");
    await saveCampaignAction(null, fd({ ...form, id: K, lots: ["AP-1", "AP-9"] }));
    expect(data.updateDraft).toHaveBeenCalledWith(K, expect.objectContaining({ lots: ["AP-1"] }), [lot]);
  });

  it("test send goes to the signed-in owner only, prefixed [Test], and is logged", async () => {
    const { sendTestAction } = await import("@/app/admin/email/actions");
    expect(await sendTestAction(null, fd({ id: K }))).toEqual({ ok: "Test sent to owner@auraprotocols.com." });
    expect(renderFor).toHaveBeenCalledWith(draft, "owner@auraprotocols.com", null, { test: true });
    expect(sendTracked.mock.calls[0][0]).toMatchObject({ email: "owner@auraprotocols.com", kind: "campaign" });
    expect(sendTracked.mock.calls[0][0].ref).toMatch(new RegExp(`^test-${K}-`));
    expect(logEmailAdminEvent).toHaveBeenCalledWith({ action: "test_sent", target: K, actor: "owner1", note: "owner@auraprotocols.com" });
  });

  it("schedule: validates the time (shop time) and refuses blocked checks", async () => {
    const { scheduleAction } = await import("@/app/admin/email/actions");
    expect(await scheduleAction(null, fd({ id: K, at: "2020-01-01T09:00" }))).toEqual({ fieldErrors: { at: "Pick the next hour or later." } });
    data.getCampaign.mockResolvedValue({ ...draft, content: { ...draft.content, body: "your stack" } });
    expect(await scheduleAction(null, fd({ id: K, at: soonLocal() }))).toMatchObject({ error: expect.stringContaining("Fix") });
    expect(data.moveCampaign).not.toHaveBeenCalled();
    data.getCampaign.mockResolvedValue(draft);
    expect(await scheduleAction(null, fd({ id: K, at: soonLocal() }))).toEqual({ ok: "Scheduled." });
    expect(data.moveCampaign).toHaveBeenCalledWith(K, "draft", "scheduled", "owner1", { scheduledFor: expect.stringMatching(/:00:00\.000Z$/) });
  });

  it("send now: starts, sends a batch, reports leftovers for the hourly run", async () => {
    data.startCampaign.mockResolvedValue({ ok: true, recipients: 2310 });
    sendCampaignBatch.mockResolvedValue({ sent: 1980, skipped: 3, failed: 0, remaining: 327, finished: false, stopped: false });
    const { sendNowAction } = await import("@/app/admin/email/actions");
    expect(await sendNowAction(null, fd({ id: K, from: "draft" }))).toEqual({ ok: "1,980 sent. The other 327 go out on the next hourly run." });
    expect(data.startCampaign).toHaveBeenCalledWith(K, "owner1", "draft");
  });

  it("send now: another campaign sending is a plain error; a stale click throws", async () => {
    const { sendNowAction } = await import("@/app/admin/email/actions");
    data.startCampaign.mockResolvedValue({ ok: false, reason: "busy" });
    expect(await sendNowAction(null, fd({ id: K, from: "draft" }))).toEqual({ error: "Another campaign is sending. Send this one when it finishes, or schedule it." });
    data.startCampaign.mockResolvedValue({ ok: false, reason: "stale" });
    await expect(sendNowAction(null, fd({ id: K, from: "draft" }))).rejects.toThrow(/changed/);
  });

  it("send now: a batch that throws (preflight/config/missing code) is caught, alerted, and reported plainly", async () => {
    data.startCampaign.mockResolvedValue({ ok: true, recipients: 2310 });
    sendCampaignBatch.mockRejectedValue(new Error('Campaign "N": its discount code is missing — not sent.'));
    const { sendNowAction } = await import("@/app/admin/email/actions");
    const r = await sendNowAction(null, fd({ id: K, from: "draft" }));
    expect(r).toMatchObject({ error: expect.stringContaining("its discount code is missing") });
    expect(r?.error).not.toMatch(/sent to \d/i); // never claims a send happened
    expect(alertOwner).toHaveBeenCalledTimes(1);
    expect(alertOwner.mock.calls[0][0]).toContain("N");
    expect(alertOwner.mock.calls[0][1]).toContain("discount code is missing");
  });

  it("send now: the failure breaker tripping mid-batch is not reported as success", async () => {
    data.startCampaign.mockResolvedValue({ ok: true, recipients: 2310 });
    sendCampaignBatch.mockResolvedValue({ sent: 410, skipped: 0, failed: 5, remaining: 1895, finished: false, stopped: false });
    const { sendNowAction } = await import("@/app/admin/email/actions");
    const r = await sendNowAction(null, fd({ id: K, from: "draft" }));
    expect(r).toEqual({ error: "410 sent. 5 couldn't be sent; 1,895 still to go — the hourly run will try again." });
  });

  it("pause switch: ok, or a stale click throws", async () => {
    const { setAutomationAction } = await import("@/app/admin/email/actions");
    setAutomationPaused.mockResolvedValue(true);
    expect(await setAutomationAction(null, fd({ automation: "cart", paused: "1", note: " link fix " }))).toEqual({ ok: "Cart reminders paused." });
    expect(setAutomationPaused).toHaveBeenCalledWith("cart", true, "owner1", "link fix");
    setAutomationPaused.mockResolvedValue(false);
    await expect(setAutomationAction(null, fd({ automation: "welcome", paused: "0" }))).rejects.toThrow(/changed/);
  });

  it("announce: a New lots draft from the waiting lots", async () => {
    const lot = { compoundName: "BPC-157", slug: "bpc-157", strengths: "10 mg", lot: "AP-1", purityPct: 99.4, method: "HPLC+MS", testedOn: "2026-10-02", coaFile: "/coa/AP-1.pdf" };
    data.waitingLots.mockResolvedValue([lot]);
    data.createCampaign.mockResolvedValue(K);
    const { announceAction } = await import("@/app/admin/email/actions");
    await expect(announceAction()).rejects.toThrow(`REDIRECT:/admin/email/campaigns/${K}`);
    expect(data.createCampaign).toHaveBeenCalledWith("new_lots", expect.objectContaining({ lots: ["AP-1"], subject: "Certified: BPC-157, lot AP-1" }), [lot], "owner1");
  });

  it("stop: owner-only, moves sending → stopped, and the action itself carries no \"instant\" promise", async () => {
    const { stopAction } = await import("@/app/admin/email/actions");
    await stopAction(fd({ id: K }));
    expect(data.moveCampaign).toHaveBeenCalledWith(K, "sending", "stopped", "owner1");
    requireOwner.mockRejectedValue(new Error("NOT_FOUND"));
    await expect(stopAction(fd({ id: K }))).rejects.toThrow("NOT_FOUND");
  });
});
