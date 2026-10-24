import { describe, it, expect, vi, beforeEach } from "vitest";
import { ownerStaff } from "../helpers/staff";

const requirePermission = vi.fn();
vi.mock("@/lib/dal", () => ({ requirePermission }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const redirect = vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`); });
vi.mock("next/navigation", () => ({ redirect }));
const data = {
  getCampaign: vi.fn(), createCampaign: vi.fn(), updateDraft: vi.fn(), moveCampaign: vi.fn(), startCampaign: vi.fn(),
  lotChoices: vi.fn(), waitingLots: vi.fn(), codeForCampaign: vi.fn(),
};
vi.mock("@/lib/email/campaigns/data", () => data);
const sendCampaignBatch = vi.fn(), renderFor = vi.fn(), campaignCode = vi.fn(), earlyRun = vi.fn();
vi.mock("@/lib/email/campaigns/send", () => ({ sendCampaignBatch, renderFor, campaignCode, earlyRun }));
const setEarlyAccessOpen = vi.fn();
vi.mock("@/lib/early/data", () => ({ setEarlyAccessOpen }));
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
const draft = { id: K, kind: "news", status: "draft", name: "N", subject: "S", preview_text: "", content: { headline: "H", body: "Fine.", buttonLabel: "", buttonPath: "" }, audience: "all", discount_code_id: null, lots_snapshot: [], updated_at: "2026-10-06T12:00:00.000Z" };
const fd = (o: Record<string, string | string[]>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) (Array.isArray(v) ? v : [v]).forEach((x) => f.append(k, x)); return f; };
const form = { name: "N", subject: "S", previewText: "", headline: "H", body: "Fine.", buttonLabel: "", buttonPath: "", audience: "all" };

describe("admin email actions", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const f of [...Object.values(data), sendCampaignBatch, renderFor, campaignCode, earlyRun, setEarlyAccessOpen, audienceCounts, sendTracked, setAutomationPaused, logEmailAdminEvent, requirePermission, alertOwner]) f.mockReset();
    requirePermission.mockResolvedValue(ownerStaff({ id: "owner1", email: "owner@auraprotocols.com" }));
    data.getCampaign.mockResolvedValue(draft);
    data.lotChoices.mockResolvedValue([]);
    audienceCounts.mockResolvedValue({ all: 2310, ordered: 486, never_ordered: 1824 });
    campaignCode.mockResolvedValue(null);
    earlyRun.mockResolvedValue(null);
    renderFor.mockResolvedValue({ msg: { subject: "[Test] S", html: "<p>x</p>" }, unsub: "u" });
  });

  it("every action is owner-only", async () => {
    requirePermission.mockRejectedValue(new Error("NOT_FOUND"));
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

  it("test send, schedule and send now all refuse a stale updatedAt without acting", async () => {
    const { sendTestAction, scheduleAction, sendNowAction } = await import("@/app/admin/email/actions");
    await expect(sendTestAction(null, fd({ id: K, updatedAt: "2020-01-01T00:00:00.000Z" }))).rejects.toThrow(/changed/);
    expect(sendTracked).not.toHaveBeenCalled();
    await expect(scheduleAction(null, fd({ id: K, at: soonLocal(), updatedAt: "2020-01-01T00:00:00.000Z" }))).rejects.toThrow(/changed/);
    expect(data.moveCampaign).not.toHaveBeenCalled();
    await expect(sendNowAction(null, fd({ id: K, from: "draft", updatedAt: "2020-01-01T00:00:00.000Z" }))).rejects.toThrow(/changed/);
    expect(data.startCampaign).not.toHaveBeenCalled();
  });

  it("test send goes to the signed-in owner only, prefixed [Test], and is logged", async () => {
    const { sendTestAction } = await import("@/app/admin/email/actions");
    expect(await sendTestAction(null, fd({ id: K, updatedAt: draft.updated_at }))).toEqual({ ok: "Test sent to owner@auraprotocols.com." });
    expect(renderFor).toHaveBeenCalledWith(draft, "owner@auraprotocols.com", null, { test: true }, null);
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

  it("send now: a batch that throws (preflight/config/missing code) is caught, alerted, and the campaign already being 'sending' means the page would otherwise show the results view and lose the message — redirect with it in a query param instead", async () => {
    data.startCampaign.mockResolvedValue({ ok: true, recipients: 2310 });
    sendCampaignBatch.mockRejectedValue(new Error('Campaign "N": its discount code is missing — not sent.'));
    const { sendNowAction } = await import("@/app/admin/email/actions");
    await expect(sendNowAction(null, fd({ id: K, from: "draft" }))).rejects.toThrow(`REDIRECT:/admin/email/campaigns/${K}?sendError=`);
    const [url] = redirect.mock.calls.at(-1)!;
    const message = decodeURIComponent(url.slice(url.indexOf("sendError=") + "sendError=".length));
    expect(message).toContain("its discount code is missing");
    expect(message).not.toMatch(/sent to \d/i); // never claims a send happened
    expect(alertOwner).toHaveBeenCalledTimes(1);
    expect(alertOwner.mock.calls[0][0]).toBe("Campaign send now failed to start");
    expect(alertOwner.mock.calls[0][1]).toContain('"N"');
    expect(alertOwner.mock.calls[0][1]).toContain("discount code is missing");
  });

  it("send now: the failure breaker tripping mid-batch is not reported as success — also redirected with the message, not lost to the results view", async () => {
    data.startCampaign.mockResolvedValue({ ok: true, recipients: 2310 });
    sendCampaignBatch.mockResolvedValue({ sent: 410, skipped: 0, failed: 5, remaining: 1895, finished: false, stopped: false });
    const { sendNowAction } = await import("@/app/admin/email/actions");
    await expect(sendNowAction(null, fd({ id: K, from: "draft" }))).rejects.toThrow(`REDIRECT:/admin/email/campaigns/${K}?sendError=`);
    const [url] = redirect.mock.calls.at(-1)!;
    const message = decodeURIComponent(url.slice(url.indexOf("sendError=") + "sendError=".length));
    expect(message).toBe("410 sent. 5 couldn't be sent; 1,895 still to go — the hourly run will try again.");
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
    requirePermission.mockRejectedValue(new Error("NOT_FOUND"));
    await expect(stopAction(fd({ id: K }))).rejects.toThrow("NOT_FOUND");
  });

  describe("early access", () => {
    const early = { ...draft, kind: "early_access", name: "Pre-launch · Early access", subject: "Your early access is open", audience: "waitlist", content: { headline: "", body: "", buttonLabel: "", buttonPath: "" } };

    it("send now turns early access on before the first email, and logs it", async () => {
      data.getCampaign.mockResolvedValue({ ...early, content: { ...early.content, openingOn: "2099-12-01" } });
      data.startCampaign.mockResolvedValue({ ok: true, recipients: 3 });
      audienceCounts.mockResolvedValue({ all: 9, ordered: 0, never_ordered: 9, waitlist: 3, waitlist_never_ordered: 3 });
      setEarlyAccessOpen.mockResolvedValue(true);
      sendCampaignBatch.mockImplementation(async () => {
        expect(setEarlyAccessOpen).toHaveBeenCalledWith(true);
        return { sent: 3, skipped: 0, failed: 0, remaining: 0, finished: true, stopped: false };
      });
      const { sendNowAction } = await import("@/app/admin/email/actions");
      expect(await sendNowAction(null, fd({ id: K, from: "draft" }))).toEqual({ ok: "Sent to 3 people." });
      expect(logEmailAdminEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "early_access_on", target: K }));
    });

    it("send now is blocked without an opening date", async () => {
      data.getCampaign.mockResolvedValue(early);
      audienceCounts.mockResolvedValue({ all: 9, ordered: 0, never_ordered: 9, waitlist: 3, waitlist_never_ordered: 3 });
      const { sendNowAction } = await import("@/app/admin/email/actions");
      expect(await sendNowAction(null, fd({ id: K, from: "draft" }))).toMatchObject({ error: "Fix the problems listed under Checks first." });
      expect(data.startCampaign).not.toHaveBeenCalled();
      expect(setEarlyAccessOpen).not.toHaveBeenCalled();
    });

    it("the opening date is saved with the inbox preview line naming it; a past date is refused", async () => {
      data.getCampaign.mockResolvedValue(early);
      const { setOpeningDateAction } = await import("@/app/admin/email/actions");
      expect(await setOpeningDateAction(null, fd({ id: K, openingOn: "2099-12-01" }))).toEqual({ ok: "Opening date saved: Tuesday, December 1." });
      expect(data.updateDraft).toHaveBeenCalledWith(K, expect.objectContaining({
        previewText: "No code needed: your 25% comes off automatically. The store opens to everyone on Tuesday, December 1.",
        content: expect.objectContaining({ openingOn: "2099-12-01" }),
      }), []);
      expect(await setOpeningDateAction(null, fd({ id: K, openingOn: "2020-01-01" }))).toEqual({ fieldErrors: { openingOn: "The opening date must be after today." } });
      data.getCampaign.mockResolvedValue(draft);
      await expect(setOpeningDateAction(null, fd({ id: K, openingOn: "2099-12-01" }))).rejects.toThrow(/changed/);
    });

    it("the switch turns on and off; a stale click throws", async () => {
      const { setEarlyAccessAction } = await import("@/app/admin/email/actions");
      setEarlyAccessOpen.mockResolvedValue(true);
      expect(await setEarlyAccessAction(null, fd({ open: "0" }))).toEqual({ ok: "Early access is off. Early links now show the coming-soon page." });
      expect(setEarlyAccessOpen).toHaveBeenCalledWith(false);
      expect(logEmailAdminEvent).toHaveBeenCalledWith({ action: "early_access_off", target: "early_access", actor: "owner1" });
      setEarlyAccessOpen.mockResolvedValue(false);
      await expect(setEarlyAccessAction(null, fd({ open: "1" }))).rejects.toThrow(/switch changed/);
    });
  });
});
