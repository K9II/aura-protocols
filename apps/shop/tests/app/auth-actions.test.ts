import { describe, it, expect, vi, beforeEach } from "vitest";
import { query, fromQueue, callArgs } from "../helpers/supabase-mock";

const auth = { signUp: vi.fn(), signInWithPassword: vi.fn(), signOut: vi.fn(), resetPasswordForEmail: vi.fn(), updateUser: vi.fn() };
const deleteUser = vi.fn();
const startSubscription = vi.fn();
const alertOwner = vi.fn();
let from: ReturnType<typeof fromQueue>;
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth }) }));
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: (t: string) => from(t), auth: { admin: { deleteUser } } }) }));
vi.mock("@/lib/gate", () => ({ hashIp: (ip: string) => `h:${ip}` }));
vi.mock("@/lib/email/subscribe", () => ({ startSubscription }));
vi.mock("@/lib/notify", () => ({ alertOwner }));
vi.mock("@/lib/partners/ref-cookie", () => ({ REF_COOKIE: "aura_ref", readRef: () => null }));
let headerCookie: { value: string } | undefined;
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "1.2.3.4", "user-agent": "UA" }),
  cookies: async () => ({ get: () => headerCookie }),
}));
vi.mock("next/navigation", () => ({ redirect: (u: string) => { throw new Error(`REDIRECT:${u}`); } }));

function fd(values: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(values)) f.set(k, v);
  return f;
}
const signup = { fullName: "Jane Rivera", email: "Jane@Lab.org", password: "correct horse battery", organization: "", age21: "on", ruo: "on", dispute: "on", next: "/checkout" };

describe("auth actions", () => {
  beforeEach(() => { vi.resetModules(); for (const f of Object.values(auth)) f.mockReset(); deleteUser.mockReset(); startSubscription.mockReset(); alertOwner.mockReset(); headerCookie = undefined; });

  it("sign-up requires all three agreements", async () => {
    const { signUpAction } = await import("@/app/auth/actions");
    const r = await signUpAction(undefined, fd({ ...signup, ruo: "" }));
    expect(r?.error).toMatch(/three/i);
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it("sign-up creates the auth user, the customer row and the agreements record", async () => {
    auth.signUp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const customersQ = query({}); const agreementsQ = query({});
    from = fromQueue({ customers: [customersQ], account_agreements: [agreementsQ] });
    const { signUpAction } = await import("@/app/auth/actions");
    const r = await signUpAction(undefined, fd(signup));
    expect(r).toEqual({ ok: true, message: expect.stringMatching(/verify/i) });
    expect(auth.signUp).toHaveBeenCalledWith(expect.objectContaining({ email: "jane@lab.org", password: "correct horse battery" }));
    expect(callArgs(customersQ, "insert")?.[0]).toEqual({ id: "u1", full_name: "Jane Rivera", organization: null });
    expect(callArgs(agreementsQ, "insert")?.[0]).toMatchObject({ customer_id: "u1", age_21: true, ruo: true, dispute_policy: true, ip_hash: "h:1.2.3.4", user_agent: "UA" });
  });

  it("sign-up with the email opt-in checked starts a subscription", async () => {
    auth.signUp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    from = fromQueue({ customers: [query({})], account_agreements: [query({})] });
    const { signUpAction } = await import("@/app/auth/actions");
    await signUpAction(undefined, fd({ ...signup, emailOptIn: "on" }));
    expect(startSubscription).toHaveBeenCalledWith({ email: "jane@lab.org", source: "signup", partnerRef: null });
  });

  it("sign-up without the email opt-in never starts a subscription", async () => {
    auth.signUp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    from = fromQueue({ customers: [query({})], account_agreements: [query({})] });
    const { signUpAction } = await import("@/app/auth/actions");
    await signUpAction(undefined, fd(signup));
    expect(startSubscription).not.toHaveBeenCalled();
  });

  it("sign-up still succeeds and alerts the owner when the subscription can't be started", async () => {
    auth.signUp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    from = fromQueue({ customers: [query({})], account_agreements: [query({})] });
    startSubscription.mockRejectedValue(new Error("ses down"));
    const { signUpAction } = await import("@/app/auth/actions");
    const r = await signUpAction(undefined, fd({ ...signup, emailOptIn: "on" }));
    expect(r).toEqual({ ok: true, message: expect.stringMatching(/verify/i) });
    expect(alertOwner).toHaveBeenCalled();
  });

  it("sign-up removes the auth user if the records can't be saved (no half-created accounts)", async () => {
    auth.signUp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    from = fromQueue({ customers: [query({ error: { message: "down" } })] });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { signUpAction } = await import("@/app/auth/actions");
    const r = await signUpAction(undefined, fd(signup));
    expect(r?.error).toBeTruthy();
    expect(deleteUser).toHaveBeenCalledWith("u1");
  });

  it("sign-up for an already-verified email says so (Supabase returns a user with no identities)", async () => {
    auth.signUp.mockResolvedValue({ data: { user: { id: "fake", identities: [] } }, error: null });
    from = fromQueue({});
    const { signUpAction } = await import("@/app/auth/actions");
    const r = await signUpAction(undefined, fd(signup));
    expect(r?.error).toMatch(/already exists/i);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("a repeat sign-up of an unverified email never deletes that existing account", async () => {
    auth.signUp.mockResolvedValue({ data: { user: { id: "u1", identities: [{ id: "i1" }] } }, error: null });
    from = fromQueue({ customers: [query({ error: { code: "23505", message: "duplicate key" } })] });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { signUpAction } = await import("@/app/auth/actions");
    const r = await signUpAction(undefined, fd(signup));
    expect(deleteUser).not.toHaveBeenCalled();
    expect(r).toEqual({ ok: true, message: expect.stringMatching(/verify/i) });
  });

  it("sign-in redirects to a safe next path, or reports bad credentials", async () => {
    auth.signInWithPassword.mockResolvedValueOnce({ error: { message: "Invalid login credentials" } });
    const { signInAction } = await import("@/app/auth/actions");
    expect((await signInAction(undefined, fd({ email: "j@lab.org", password: "x", next: "/checkout" })))?.error).toMatch(/email or password/i);
    auth.signInWithPassword.mockResolvedValueOnce({ error: null });
    await expect(signInAction(undefined, fd({ email: "j@lab.org", password: "x", next: "//evil" }))).rejects.toThrow("REDIRECT:/account");
  });

  it("password reset never reveals whether an account exists", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: { message: "User not found" } });
    const { requestPasswordResetAction } = await import("@/app/auth/actions");
    expect(await requestPasswordResetAction(undefined, fd({ email: "nobody@lab.org" }))).toEqual({ ok: true, message: expect.stringMatching(/if an account exists/i) });
  });
});
