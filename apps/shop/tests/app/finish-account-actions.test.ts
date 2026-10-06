import { describe, it, expect, vi, beforeEach } from "vitest";

const getAccountState = vi.fn(), getUnfinishedUser = vi.fn(), finishGoogleAccount = vi.fn();
vi.mock("@/lib/dal", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/dal")>()), getAccountState, getUnfinishedUser }));
vi.mock("@/lib/account/create", () => ({ finishGoogleAccount, NOT_GOOGLE: "Please sign out and create your account with email." }));
vi.mock("@/lib/partners/ref-cookie", () => ({ REF_COOKIE: "aura_ref", readRef: (v?: string) => (v === "signed-SMITHLAB" ? "SMITHLAB" : null) }));
let cookieJar: Record<string, string> = {};
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1", "user-agent": "UA" }),
  cookies: async () => ({ get: (n: string) => (n in cookieJar ? { value: cookieJar[n] } : undefined) }),
}));
vi.mock("next/navigation", () => ({ redirect: (u: string) => { throw new Error(`REDIRECT:${u}`); } }));

function fd(values: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(values)) f.set(k, v);
  return f;
}
const form = { fullName: " Dana Whitfield ", organization: "", agree: "on", next: "/products" };
const dana = { id: "g1", email: "dana@gmail.com", suggestedName: "Dana Whitfield", viaGoogle: true };
const unfinished = { customer: null, blocked: false, unfinished: true };

describe("finishAccountAction", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const f of [getAccountState, getUnfinishedUser, finishGoogleAccount]) f.mockReset();
    getAccountState.mockResolvedValue(unfinished); getUnfinishedUser.mockResolvedValue(dana);
    finishGoogleAccount.mockResolvedValue({ ok: true });
    cookieJar = {};
  });

  it("needs the agreement box", async () => {
    const { finishAccountAction } = await import("@/app/finish-account/actions");
    expect(await finishAccountAction(undefined, fd({ ...form, agree: "" }))).toEqual({ error: "Please agree to the terms to create an account." });
    expect(finishGoogleAccount).not.toHaveBeenCalled();
  });

  it("needs a name", async () => {
    const { finishAccountAction } = await import("@/app/finish-account/actions");
    expect(await finishAccountAction(undefined, fd({ ...form, fullName: "   " }))).toEqual({ error: "Please enter your full name." });
    expect(finishGoogleAccount).not.toHaveBeenCalled();
  });

  it("creates the account through the shared path with IP, user agent, partner ref and marketing on, then goes to next", async () => {
    cookieJar = { aura_ref: "signed-SMITHLAB" };
    const { finishAccountAction } = await import("@/app/finish-account/actions");
    await expect(finishAccountAction(undefined, fd({ ...form, organization: "Whitfield Lab" }))).rejects.toThrow("REDIRECT:/products");
    expect(finishGoogleAccount).toHaveBeenCalledWith({
      userId: "g1", email: "dana@gmail.com", fullName: "Dana Whitfield", organization: "Whitfield Lab", optIn: true,
      ip: "1.2.3.4", userAgent: "UA", partnerRef: "SMITHLAB", emailVerified: true,
    });
  });

  it("a non-Google unfinished user can't finish here (no free account without our checks)", async () => {
    getUnfinishedUser.mockResolvedValue({ ...dana, viaGoogle: false });
    const { finishAccountAction } = await import("@/app/finish-account/actions");
    expect(await finishAccountAction(undefined, fd(form))).toEqual({ error: "Please sign out and create your account with email." });
    expect(finishGoogleAccount).not.toHaveBeenCalled();
  });

  it("an unsafe next goes home", async () => {
    const { finishAccountAction } = await import("@/app/finish-account/actions");
    await expect(finishAccountAction(undefined, fd({ ...form, next: "//evil.example" }))).rejects.toThrow(/^REDIRECT:\/$/);
  });

  it("shows the creation error", async () => {
    finishGoogleAccount.mockResolvedValue({ ok: false, error: "We couldn't create your account — please try again." });
    const { finishAccountAction } = await import("@/app/finish-account/actions");
    expect(await finishAccountAction(undefined, fd(form))).toEqual({ error: "We couldn't create your account — please try again." });
  });

  it("already finished → next; blocked → closed message; signed out → sign-in", async () => {
    const { finishAccountAction } = await import("@/app/finish-account/actions");
    getAccountState.mockResolvedValueOnce({ customer: { id: "g1" }, blocked: false, unfinished: false });
    await expect(finishAccountAction(undefined, fd(form))).rejects.toThrow("REDIRECT:/products");
    getAccountState.mockResolvedValueOnce({ customer: null, blocked: true, unfinished: false });
    expect((await finishAccountAction(undefined, fd(form)))?.error).toMatch(/This account is closed/);
    getAccountState.mockResolvedValueOnce({ customer: null, blocked: false, unfinished: false });
    getUnfinishedUser.mockResolvedValueOnce(null);
    await expect(finishAccountAction(undefined, fd(form))).rejects.toThrow("REDIRECT:/sign-in?next=%2Fproducts");
    expect(finishGoogleAccount).not.toHaveBeenCalled();
  });
});
