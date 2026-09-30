import { describe, it, expect, vi, beforeEach } from "vitest";

const requireApprovedPartner = vi.fn();
const getCustomer = vi.fn();
const setPayoutPref = vi.fn();
const setPayoutMethod = vi.fn();
const uploadW9 = vi.fn();
const changeCode = vi.fn();
const isCodeTaken = vi.fn();
const sendOrAlert = vi.fn();
vi.mock("@/lib/dal", () => ({ requireApprovedPartner, getCustomer }));
vi.mock("@/lib/partners/data", () => ({ setPayoutPref, setPayoutMethod, uploadW9, changeCode, isCodeTaken, createApplication: vi.fn(), issueCode: vi.fn() }));
vi.mock("@/lib/notify", () => ({ sendOrAlert, alertOwner: vi.fn(), alertAddress: () => "owner@example.com" }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/gate", () => ({ hashIp: () => "h" }));

function fd(v: Record<string, string | File>) { const f = new FormData(); for (const [k, x] of Object.entries(v)) f.set(k, x); return f; }
const partner = { id: "p1", code: "SMITHLAB", status: "approved" };

describe("partner settings actions", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const f of [requireApprovedPartner, getCustomer, setPayoutPref, setPayoutMethod, uploadW9, changeCode, isCodeTaken, sendOrAlert]) f.mockReset();
    requireApprovedPartner.mockResolvedValue({ customer: { id: "u1" }, partner });
    // changeCodeAction reuses checkCodeAvailableAction, which itself now requires a signed-in, verified customer.
    getCustomer.mockResolvedValue({ id: "u1", email: "sam@smithlab.org", emailConfirmed: true, fullName: "Sam Smith" });
    isCodeTaken.mockResolvedValue(false);
    changeCode.mockResolvedValue({ ok: true });
  });

  it("changes the code, keeping the old one working", async () => {
    const { changeCodeAction } = await import("@/app/partners/actions");
    expect(await changeCodeAction(undefined, fd({ code: "smith lab2" }))).toEqual({ ok: true });
    expect(changeCode).toHaveBeenCalledWith("p1", "SMITHLAB", "SMITHLAB2");
    expect((await changeCodeAction(undefined, fd({ code: "aura1" })))?.error).toMatch(/isn't available/);
    isCodeTaken.mockResolvedValue(true);
    expect((await changeCodeAction(undefined, fd({ code: "BENCHNOTES" })))?.error).toMatch(/already taken/);
  });

  it("saves cash / credit / split preferences", async () => {
    const { setPayoutPrefAction } = await import("@/app/partners/actions");
    expect(await setPayoutPrefAction(undefined, fd({ pref: "split", splitCashPct: "50" }))).toEqual({ ok: true });
    expect(setPayoutPref).toHaveBeenCalledWith("p1", "split", 50);
    expect((await setPayoutPrefAction(undefined, fd({ pref: "split", splitCashPct: "150" })))?.error).toBeTruthy();
    expect((await setPayoutPrefAction(undefined, fd({ pref: "bitcoin", splitCashPct: "0" })))?.error).toBeTruthy();
  });

  it("validates ACH and Zelle details before saving", async () => {
    const { setPayoutMethodAction } = await import("@/app/partners/actions");
    expect(await setPayoutMethodAction(undefined, fd({ kind: "ach", routing: "021000021", account: "123456784821", bank: "Chase" }))).toEqual({ ok: true });
    expect(setPayoutMethod).toHaveBeenCalledWith("p1", { kind: "ach", routing: "021000021", account: "123456784821", bank: "Chase" });
    expect((await setPayoutMethodAction(undefined, fd({ kind: "ach", routing: "12345", account: "1", bank: "" })))?.error).toBeTruthy();
    expect(await setPayoutMethodAction(undefined, fd({ kind: "zelle", handle: "pay@vialreview.com" }))).toEqual({ ok: true });
    expect((await setPayoutMethodAction(undefined, fd({ kind: "zelle", handle: "not a handle" })))?.error).toBeTruthy();
  });

  it("accepts only PDFs up to 5 MB for the W-9 and alerts the owner", async () => {
    const { uploadW9Action } = await import("@/app/partners/actions");
    const pdf = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31])], "w9.pdf", { type: "application/pdf" });
    expect(await uploadW9Action(undefined, fd({ w9: pdf }))).toEqual({ ok: true });
    expect(uploadW9).toHaveBeenCalledWith("p1", expect.any(Uint8Array));
    expect(sendOrAlert.mock.calls[0][0]).toMatchObject({ subject: "W-9 uploaded by SMITHLAB — please check it" });
    const png = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "w9.png", { type: "image/png" });
    expect((await uploadW9Action(undefined, fd({ w9: png })))?.error).toMatch(/PDF/);
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "w9.pdf", { type: "application/pdf" });
    expect((await uploadW9Action(undefined, fd({ w9: big })))?.error).toMatch(/5 MB/);
  });
});
