import { describe, it, expect, vi, beforeEach } from "vitest";

const getCustomer = vi.fn();
const isCodeTaken = vi.fn();
const createApplication = vi.fn();
const issueCode = vi.fn();
const alertOwner = vi.fn();
const sendOrAlert = vi.fn();
vi.mock("@/lib/dal", () => ({ getCustomer }));
vi.mock("@/lib/partners/data", () => ({ isCodeTaken, createApplication, issueCode }));
vi.mock("@/lib/notify", () => ({ alertOwner, sendOrAlert, alertAddress: () => "owner@example.com" }));
vi.mock("@/lib/gate", () => ({ hashIp: (ip: string) => `h(${ip})` }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "1.2.3.4", "user-agent": "ua" }) }));
vi.mock("next/navigation", () => ({ redirect: (u: string) => { throw new Error(`REDIRECT:${u}`); } }));

function fd(v: Record<string, string>) { const f = new FormData(); for (const [k, x] of Object.entries(v)) f.set(k, x); return f; }
const valid = { partnerType: "academic_researcher", ch_youtube: "on", h_youtube: "youtube.com/@smithlab", audienceSize: "5k_25k", promotion: "Monthly newsletter", agree: "on" };
const customer = { id: "u1", email: "sam@smithlab.org", emailConfirmed: true, fullName: "Sam Smith" };
const unverified = { ...customer, emailConfirmed: false };

describe("applyPartnerAction", () => {
  beforeEach(() => { vi.resetModules(); for (const f of [getCustomer, isCodeTaken, createApplication, issueCode, alertOwner, sendOrAlert]) f.mockReset(); isCodeTaken.mockResolvedValue(false); issueCode.mockResolvedValue("K7M2Q9XP"); });

  it("requires a signed-in customer", async () => {
    getCustomer.mockResolvedValue(null);
    const { applyPartnerAction } = await import("@/app/partners/actions");
    expect((await applyPartnerAction(undefined, fd(valid)))?.error).toMatch(/sign in/i);
  });

  it("requires a verified email", async () => {
    getCustomer.mockResolvedValue(unverified);
    const { applyPartnerAction } = await import("@/app/partners/actions");
    expect((await applyPartnerAction(undefined, fd(valid)))?.error).toBe("Please verify your email first — check your inbox for the link.");
    expect(createApplication).not.toHaveBeenCalled();
  });

  it("rejects a missing agreement and unknown types", async () => {
    getCustomer.mockResolvedValue(customer);
    const { applyPartnerAction } = await import("@/app/partners/actions");
    expect((await applyPartnerAction(undefined, fd({ ...valid, agree: "" })))?.error).toBeTruthy();
    expect((await applyPartnerAction(undefined, fd({ ...valid, partnerType: "fitness_coach" })))?.error).toBeTruthy();
    expect((await applyPartnerAction(undefined, fd({ ...valid, audienceSize: "millions" })))?.error).toBeTruthy();
    expect(createApplication).not.toHaveBeenCalled();
  });

  it("needs at least one channel with its handle; Other needs a description", async () => {
    getCustomer.mockResolvedValue(customer);
    const { applyPartnerAction } = await import("@/app/partners/actions");
    const { ch_youtube, h_youtube, ...none } = valid;
    void ch_youtube; void h_youtube;
    expect((await applyPartnerAction(undefined, fd(none)))?.error).toMatch(/at least one/i);
    expect((await applyPartnerAction(undefined, fd({ ...valid, h_youtube: "" })))?.error).toMatch(/at least one/i);
    expect((await applyPartnerAction(undefined, fd({ ...none, ch_other: "on", h_other: "" })))?.error).toMatch(/at least one/i);
    expect(createApplication).not.toHaveBeenCalled();
    createApplication.mockResolvedValue({ id: "p1" });
    await expect(applyPartnerAction(undefined, fd({ ...valid, ch_x: "on", h_x: "@smithlab", ch_other: "on", h_other: "Methods newsletter, 4,000 subscribers" })))
      .rejects.toThrow("REDIRECT:/partners");
    expect(createApplication.mock.calls[0][0].application).toEqual({
      channels: { youtube: "youtube.com/@smithlab", x: "@smithlab" }, other: "Methods newsletter, 4,000 subscribers",
      audienceSize: "5k_25k", promotion: "Monthly newsletter",
    });
  });

  it("issues a random code, records the agreement, alerts the owner and goes to the dashboard", async () => {
    getCustomer.mockResolvedValue(customer);
    createApplication.mockResolvedValue({ id: "p1" });
    const { applyPartnerAction } = await import("@/app/partners/actions");
    await expect(applyPartnerAction(undefined, fd(valid))).rejects.toThrow("REDIRECT:/partners");
    expect(issueCode).toHaveBeenCalledWith();
    expect(createApplication).toHaveBeenCalledWith({
      customerId: "u1", partnerType: "academic_researcher", code: "K7M2Q9XP",
      application: { channels: { youtube: "youtube.com/@smithlab" }, audienceSize: "5k_25k", promotion: "Monthly newsletter" },
      agreement: { version: "2026-10-02", ipHash: "h(1.2.3.4)", userAgent: "ua" },
    });
    expect(sendOrAlert.mock.calls[0][0]).toMatchObject({ to: "owner@example.com", subject: "New partner application — K7M2Q9XP" });
  });

  it("retries with a fresh code if the issued one was taken in the meantime", async () => {
    getCustomer.mockResolvedValue(customer);
    issueCode.mockResolvedValueOnce("K7M2Q9XP").mockResolvedValueOnce("H3NQ8TWD");
    createApplication.mockResolvedValueOnce({ error: "code_taken" }).mockResolvedValueOnce({ id: "p1" });
    const { applyPartnerAction } = await import("@/app/partners/actions");
    await expect(applyPartnerAction(undefined, fd(valid))).rejects.toThrow("REDIRECT:/partners");
    expect(createApplication.mock.calls[1][0].code).toBe("H3NQ8TWD");
  });

  it("sends an already-applied race straight to the dashboard, without retrying the code", async () => {
    getCustomer.mockResolvedValue(customer);
    createApplication.mockResolvedValue({ error: "already_applied" });
    const { applyPartnerAction } = await import("@/app/partners/actions");
    await expect(applyPartnerAction(undefined, fd(valid))).rejects.toThrow("REDIRECT:/partners");
    expect(issueCode).toHaveBeenCalledTimes(1);
    expect(createApplication).toHaveBeenCalledTimes(1);
    expect(sendOrAlert).not.toHaveBeenCalled();
  });
});

describe("checkCodeAvailableAction", () => {
  beforeEach(() => { vi.resetModules(); getCustomer.mockReset(); isCodeTaken.mockReset(); getCustomer.mockResolvedValue(customer); });

  it("requires a signed-in customer with a verified email", async () => {
    getCustomer.mockResolvedValue(null);
    const { checkCodeAvailableAction } = await import("@/app/partners/actions");
    expect(await checkCodeAvailableAction("smithlab")).toEqual({ ok: false, message: "Please sign in." });
    getCustomer.mockResolvedValue(unverified);
    expect(await checkCodeAvailableAction("smithlab")).toEqual({ ok: false, message: "Please verify your email first — check your inbox for the link." });
  });

  it("explains why a code can't be used", async () => {
    const { checkCodeAvailableAction } = await import("@/app/partners/actions");
    expect(await checkCodeAvailableAction("ab")).toEqual({ ok: false, message: "Use 3–20 letters or numbers." });
    isCodeTaken.mockResolvedValue(true);
    expect(await checkCodeAvailableAction("smithlab")).toEqual({ ok: false, message: "That code is already taken." });
    isCodeTaken.mockResolvedValue(false);
    expect(await checkCodeAvailableAction("smithlab")).toEqual({ ok: true, code: "SMITHLAB" });
  });
});
