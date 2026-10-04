import { describe, it, expect, vi, beforeEach } from "vitest";

const auth = { signInWithPassword: vi.fn(), signOut: vi.fn(), resetPasswordForEmail: vi.fn(), updateUser: vi.fn() };
const createAccount = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth }) }));
vi.mock("@/lib/account/create", () => ({ createAccount }));
vi.mock("@/lib/gate", () => ({ hashIp: (ip: string) => `h:${ip}`, DEVICE_FLAG_COOKIE: "aura_dev", verifyDeviceFlag: (v?: string) => v === "flag" }));
vi.mock("@/lib/partners/ref-cookie", () => ({ REF_COOKIE: "aura_ref", readRef: () => null }));
let cookieJar: Record<string, string> = {};
const cookieDelete = vi.fn();
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "1.2.3.4", "user-agent": "UA" }),
  cookies: async () => ({ get: (n: string) => (n in cookieJar ? { value: cookieJar[n] } : undefined), delete: cookieDelete }),
}));
vi.mock("next/navigation", () => ({ redirect: (u: string) => { throw new Error(`REDIRECT:${u}`); } }));

function fd(values: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(values)) f.set(k, v);
  return f;
}
const signup = { fullName: "Jane Rivera", email: "Jane@Lab.org", password: "correct horse battery", organization: "", agree: "on", next: "/checkout" };

describe("auth actions", () => {
  beforeEach(() => { vi.resetModules(); for (const f of Object.values(auth)) f.mockReset(); createAccount.mockReset(); cookieDelete.mockReset(); cookieJar = {}; });

  it("sign-up requires the combined agreement", async () => {
    const { signUpAction } = await import("@/app/auth/actions");
    expect((await signUpAction(undefined, fd({ ...signup, agree: "" })))?.error).toMatch(/agree/i);
    expect(createAccount).not.toHaveBeenCalled();
  });

  it("sign-up passes the form, IP, user agent, opt-in and partner ref to createAccount", async () => {
    createAccount.mockResolvedValue({ ok: true, customerId: "u1", verifyRequired: false });
    const { signUpAction } = await import("@/app/auth/actions");
    const r = await signUpAction(undefined, fd({ ...signup, emailOptIn: "on" }));
    expect(r).toEqual({ ok: true, message: expect.stringMatching(/confirm/i) });
    expect(createAccount).toHaveBeenCalledWith({ fullName: "Jane Rivera", email: "jane@lab.org", password: "correct horse battery", organization: null, optIn: true, ip: "1.2.3.4", userAgent: "UA", deviceFlagged: false, partnerRef: null });
  });

  it("sign-up from a flagged device tells createAccount so", async () => {
    cookieJar = { aura_dev: "flag" };
    createAccount.mockResolvedValue({ ok: true, customerId: "u1", verifyRequired: true });
    const { signUpAction } = await import("@/app/auth/actions");
    await signUpAction(undefined, fd(signup));
    expect(createAccount).toHaveBeenCalledWith(expect.objectContaining({ deviceFlagged: true }));
  });

  it("sign-up shows createAccount's error", async () => {
    createAccount.mockResolvedValue({ ok: false, error: "Please use an email address you can receive mail at." });
    const { signUpAction } = await import("@/app/auth/actions");
    expect((await signUpAction(undefined, fd(signup)))?.error).toBe("Please use an email address you can receive mail at.");
  });

  it("sign-in redirects to a safe next path, or reports bad credentials", async () => {
    auth.signInWithPassword.mockResolvedValueOnce({ error: { message: "Invalid login credentials" } });
    const { signInAction } = await import("@/app/auth/actions");
    expect((await signInAction(undefined, fd({ email: "j@lab.org", password: "x", next: "/checkout" })))?.error).toMatch(/email or password/i);
    expect(cookieDelete).not.toHaveBeenCalled();
    auth.signInWithPassword.mockResolvedValueOnce({ error: null });
    await expect(signInAction(undefined, fd({ email: "j@lab.org", password: "x", next: "//evil" }))).rejects.toThrow("REDIRECT:/account");
  });

  it("sign-in clears a leftover session-only marker on success", async () => {
    auth.signInWithPassword.mockResolvedValueOnce({ error: null });
    const { signInAction } = await import("@/app/auth/actions");
    await expect(signInAction(undefined, fd({ email: "j@lab.org", password: "x", next: "/account" }))).rejects.toThrow("REDIRECT:/account");
    expect(cookieDelete).toHaveBeenCalledWith("aura_session_only");
  });

  it("password reset never reveals whether an account exists", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: { message: "User not found" } });
    const { requestPasswordResetAction } = await import("@/app/auth/actions");
    expect(await requestPasswordResetAction(undefined, fd({ email: "nobody@lab.org" }))).toEqual({ ok: true, message: expect.stringMatching(/if an account exists/i) });
  });

  it("sign-out clears the session-only marker before redirecting", async () => {
    auth.signOut.mockResolvedValue({ error: null });
    const { signOutAction } = await import("@/app/auth/actions");
    await expect(signOutAction()).rejects.toThrow("REDIRECT:/");
    expect(cookieDelete).toHaveBeenCalledWith("aura_session_only");
  });
});
