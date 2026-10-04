import { describe, it, expect, vi, beforeEach } from "vitest";

const getCustomer = vi.fn(), sendVerifyEmail = vi.fn(), lastVerifySentAt = vi.fn(), alertOwner = vi.fn();
vi.mock("@/lib/dal", () => ({ getCustomer }));
vi.mock("@/lib/account/verify", () => ({ sendVerifyEmail, lastVerifySentAt }));
vi.mock("@/lib/notify", () => ({ alertOwner }));

const signInWithPassword = vi.fn(), createAccount = vi.fn();
let sessionOnlyArg: unknown;
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async (opts?: unknown) => { sessionOnlyArg = opts; return { auth: { signInWithPassword } }; } }));
vi.mock("@/lib/account/create", () => ({ createAccount }));
vi.mock("@/lib/gate", () => ({ DEVICE_FLAG_COOKIE: "aura_dev", verifyDeviceFlag: (v?: string) => v === "flag" }));
vi.mock("@/lib/partners/ref-cookie", () => ({ REF_COOKIE: "aura_ref", readRef: (v?: string) => v ?? null }));
let jar: Record<string, string> = {};
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "1.2.3.4", "user-agent": "UA" }),
  cookies: async () => ({ get: (n: string) => (jar[n] ? { value: jar[n] } : undefined) }),
}));

const customer = { id: "u1", email: "j@lab.org", emailConfirmed: false };

describe("resendVerifyAction", () => {
  beforeEach(() => { vi.resetModules(); for (const f of [getCustomer, sendVerifyEmail, lastVerifySentAt, alertOwner]) f.mockReset(); });

  it("needs a signed-in, unverified account", async () => {
    getCustomer.mockResolvedValue(null);
    const { resendVerifyAction } = await import("@/app/auth/gate-actions");
    expect((await resendVerifyAction()).error).toMatch(/sign in/i);
    getCustomer.mockResolvedValue({ ...customer, emailConfirmed: true });
    expect((await resendVerifyAction()).error).toMatch(/already confirmed/i);
  });

  it("refuses a second send within a minute", async () => {
    getCustomer.mockResolvedValue(customer);
    lastVerifySentAt.mockResolvedValue(new Date(Date.now() - 20_000).toISOString());
    const { resendVerifyAction } = await import("@/app/auth/gate-actions");
    expect((await resendVerifyAction()).error).toMatch(/just sent/i);
    expect(sendVerifyEmail).not.toHaveBeenCalled();
  });

  it("sends a fresh link", async () => {
    getCustomer.mockResolvedValue(customer);
    lastVerifySentAt.mockResolvedValue(null);
    const { resendVerifyAction } = await import("@/app/auth/gate-actions");
    expect(await resendVerifyAction()).toEqual({ ok: true });
    expect(sendVerifyEmail).toHaveBeenCalledWith("u1", "j@lab.org");
  });

  it("reports a failed send to the visitor and the owner", async () => {
    getCustomer.mockResolvedValue(customer);
    lastVerifySentAt.mockResolvedValue(null);
    sendVerifyEmail.mockRejectedValue(new Error("ses down"));
    const { resendVerifyAction } = await import("@/app/auth/gate-actions");
    expect((await resendVerifyAction()).error).toMatch(/couldn't send/i);
    expect(alertOwner).toHaveBeenCalled();
  });
});

describe("gateSignInAction", () => {
  beforeEach(() => { vi.resetModules(); signInWithPassword.mockReset(); jar = {}; });

  it("signs in and keeps the session only for this browser session unless Remember me", async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    const { gateSignInAction } = await import("@/app/auth/gate-actions");
    expect(await gateSignInAction({ email: "Jane@Lab.org", password: "pw", remember: false })).toEqual({ ok: true });
    expect(signInWithPassword).toHaveBeenCalledWith({ email: "jane@lab.org", password: "pw" });
    expect(sessionOnlyArg).toEqual({ sessionOnly: true });
    await gateSignInAction({ email: "jane@lab.org", password: "pw", remember: true });
    expect(sessionOnlyArg).toEqual({ sessionOnly: false });
  });

  it("gives one message for a wrong email or password", async () => {
    signInWithPassword.mockResolvedValue({ error: { message: "Invalid login credentials" } });
    const { gateSignInAction } = await import("@/app/auth/gate-actions");
    expect(await gateSignInAction({ email: "jane@lab.org", password: "x", remember: true })).toEqual({ error: "That email or password isn't right." });
  });
});

describe("gateSignUpAction", () => {
  beforeEach(() => { vi.resetModules(); createAccount.mockReset(); jar = {}; });
  const good = { email: "jane@lab.org", fullName: "Jane Rivera", password: "correct horse battery", agreed: true, optIn: false };

  it("requires the agreement and a 10-character password", async () => {
    const { gateSignUpAction } = await import("@/app/auth/gate-actions");
    expect((await gateSignUpAction({ ...good, agreed: false })).error).toMatch(/agree/i);
    expect((await gateSignUpAction({ ...good, password: "short" })).error).toMatch(/10 characters/);
    expect(createAccount).not.toHaveBeenCalled();
  });

  it("creates the account with IP, user agent, device flag and partner ref", async () => {
    jar = { aura_dev: "flag", aura_ref: "SMITHLAB" };
    createAccount.mockResolvedValue({ ok: true, customerId: "u1", verifyRequired: true });
    const { gateSignUpAction } = await import("@/app/auth/gate-actions");
    expect(await gateSignUpAction({ ...good, optIn: true })).toEqual({ ok: true, verifyRequired: true });
    expect(createAccount).toHaveBeenCalledWith({ fullName: "Jane Rivera", email: "jane@lab.org", password: "correct horse battery", organization: null, optIn: true, ip: "1.2.3.4", userAgent: "UA", deviceFlagged: true, partnerRef: "SMITHLAB" });
  });

  it("passes createAccount's error through", async () => {
    createAccount.mockResolvedValue({ ok: false, error: "An account with this email already exists — sign in instead." });
    const { gateSignUpAction } = await import("@/app/auth/gate-actions");
    expect(await gateSignUpAction(good)).toEqual({ error: "An account with this email already exists — sign in instead." });
  });
});
