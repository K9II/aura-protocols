import { describe, it, expect, vi, beforeEach } from "vitest";
import { query, fromQueue, callArgs } from "../../helpers/supabase-mock";

const auth = { signUp: vi.fn(), signOut: vi.fn() };
const deleteUser = vi.fn(), checkDeliverable = vi.fn(), signupsFromIpSince = vi.fn(), sendVerifyEmail = vi.fn(), recordOptIn = vi.fn(), alertOwner = vi.fn(), listVerifiedOptIn = vi.fn();
let from: ReturnType<typeof fromQueue>;
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth }) }));
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: (t: string) => from(t), auth: { admin: { deleteUser } } }) }));
vi.mock("@/lib/gate", () => ({ hashIp: (ip: string) => `h:${ip}` }));
vi.mock("@/lib/account/deliverable", () => ({ checkDeliverable }));
vi.mock("@/lib/account/data", () => ({ signupsFromIpSince }));
vi.mock("@/lib/account/verify", () => ({ sendVerifyEmail }));
vi.mock("@/lib/email/data", () => ({ recordOptIn }));
vi.mock("@/lib/notify", () => ({ alertOwner }));
vi.mock("@/lib/account/welcome", () => ({ listVerifiedOptIn }));

const base = { fullName: "Jane Rivera", email: "jane@lab.org", password: "correct horse battery", organization: null, optIn: false, ip: "1.2.3.4", userAgent: "UA", deviceFlagged: false, partnerRef: null };

describe("createAccount", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const f of [auth.signUp, auth.signOut, deleteUser, checkDeliverable, signupsFromIpSince, sendVerifyEmail, recordOptIn, alertOwner, listVerifiedOptIn]) f.mockReset();
    checkDeliverable.mockResolvedValue("ok"); signupsFromIpSince.mockResolvedValue(0);
    auth.signUp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    deleteUser.mockResolvedValue({ error: null }); auth.signOut.mockResolvedValue({ error: null });
    listVerifiedOptIn.mockResolvedValue(true);
  });

  it("refuses an address that can't receive mail before creating anything", async () => {
    checkDeliverable.mockResolvedValue("undeliverable");
    const { createAccount } = await import("@/lib/account/create");
    expect(await createAccount(base)).toEqual({ ok: false, error: "Please use an email address you can receive mail at." });
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it("creates the user, customer row and one combined agreement, then emails the verify link", async () => {
    const customers = query({}), agreements = query({});
    from = fromQueue({ customers: [customers], account_agreements: [agreements] });
    const { createAccount } = await import("@/lib/account/create");
    expect(await createAccount(base)).toEqual({ ok: true, customerId: "u1", verifyRequired: false });
    expect(callArgs(customers, "insert")?.[0]).toEqual({ id: "u1", full_name: "Jane Rivera", organization: null, verify_required: false, marketing_opt_in: false });
    expect(callArgs(agreements, "insert")?.[0]).toMatchObject({ customer_id: "u1", age_21: true, ruo: true, dispute_policy: true, ip_hash: "h:1.2.3.4", user_agent: "UA" });
    expect(sendVerifyEmail).toHaveBeenCalledWith("u1", "jane@lab.org");
    expect(recordOptIn).not.toHaveBeenCalled();
  });

  async function expectVerifyRequired(input = base) {
    const customers = query({});
    from = fromQueue({ customers: [customers], account_agreements: [query({})] });
    const { createAccount } = await import("@/lib/account/create");
    expect(await createAccount(input)).toMatchObject({ ok: true, verifyRequired: true });
    expect((callArgs(customers, "insert")?.[0] as { verify_required: boolean }).verify_required).toBe(true);
  }

  it("starts verify_required on the 4th sign-up from one IP in 24 h", async () => {
    signupsFromIpSince.mockResolvedValue(3);
    await expectVerifyRequired();
  });

  it("starts verify_required from a flagged device", async () => {
    await expectVerifyRequired({ ...base, deviceFlagged: true });
  });

  it("starts verify_required when the domain's mail can't be checked", async () => {
    checkDeliverable.mockResolvedValue("unknown");
    await expectVerifyRequired();
  });

  it("records the opt-in when the box is ticked", async () => {
    from = fromQueue({ customers: [query({})], account_agreements: [query({})] });
    const { createAccount } = await import("@/lib/account/create");
    await createAccount({ ...base, optIn: true, partnerRef: "SMITHLAB" });
    expect(recordOptIn).toHaveBeenCalledWith("jane@lab.org", "SMITHLAB");
  });

  it("says the account exists when Supabase reports it", async () => {
    auth.signUp.mockResolvedValue({ data: { user: null }, error: { message: "User already registered" } });
    const { createAccount } = await import("@/lib/account/create");
    expect(await createAccount(base)).toEqual({ ok: false, error: "An account with this email already exists — sign in instead." });
  });

  it("removes the auth user when its records can't be saved (no half-created accounts)", async () => {
    from = fromQueue({ customers: [query({ error: { message: "down" } })] });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { createAccount } = await import("@/lib/account/create");
    expect((await createAccount(base)).ok).toBe(false);
    expect(deleteUser).toHaveBeenCalledWith("u1");
  });

  it("maps Supabase error codes: existing address → sign in, weak password → stronger", async () => {
    const { createAccount } = await import("@/lib/account/create");
    for (const code of ["user_already_exists", "email_exists"]) {
      auth.signUp.mockResolvedValueOnce({ data: { user: null }, error: { code, message: "x" } });
      expect(await createAccount(base)).toEqual({ ok: false, error: "An account with this email already exists — sign in instead." });
    }
    auth.signUp.mockResolvedValueOnce({ data: { user: null }, error: { code: "weak_password", message: "x" } });
    expect(await createAccount(base)).toEqual({ ok: false, error: "Please choose a stronger password." });
  });

  it("never deletes an existing customer: a duplicate customer row means the account exists", async () => {
    from = fromQueue({ customers: [query({ error: { code: "23505", message: "duplicate key" } })] });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { createAccount } = await import("@/lib/account/create");
    expect(await createAccount(base)).toEqual({ ok: false, error: "An account with this email already exists — sign in instead." });
    expect(deleteUser).not.toHaveBeenCalled();
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it("clears the dead session on rollback, even if sign-out fails", async () => {
    from = fromQueue({ customers: [query({ error: { message: "down" } })] });
    vi.spyOn(console, "error").mockImplementation(() => {});
    auth.signOut.mockRejectedValue(new Error("cookie write failed"));
    const { createAccount } = await import("@/lib/account/create");
    expect((await createAccount(base)).ok).toBe(false);
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("alerts the owner when the half-created account can't be removed", async () => {
    from = fromQueue({ customers: [query({ error: { message: "down" } })] });
    vi.spyOn(console, "error").mockImplementation(() => {});
    deleteUser.mockResolvedValue({ error: { message: "admin api down" } });
    const { createAccount } = await import("@/lib/account/create");
    expect((await createAccount(base)).ok).toBe(false);
    expect(alertOwner).toHaveBeenCalledWith("Half-created account not removed", expect.stringContaining("u1 jane@lab.org"));
  });

  it("keeps the account but alerts the owner when the verify email or opt-in fails", async () => {
    from = fromQueue({ customers: [query({})], account_agreements: [query({})] });
    sendVerifyEmail.mockRejectedValue(new Error("ses down")); recordOptIn.mockRejectedValue(new Error("db down"));
    const { createAccount } = await import("@/lib/account/create");
    expect((await createAccount({ ...base, optIn: true })).ok).toBe(true);
    expect(alertOwner).toHaveBeenCalledTimes(2);
  });
});

const g = { userId: "g1", email: "dana@gmail.com", fullName: "Dana Whitfield", organization: "Whitfield Lab", optIn: true, ip: "1.2.3.4", userAgent: "UA", partnerRef: "SMITHLAB", emailVerified: true };

describe("finishGoogleAccount", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const f of [auth.signUp, auth.signOut, deleteUser, checkDeliverable, signupsFromIpSince, sendVerifyEmail, recordOptIn, alertOwner, listVerifiedOptIn]) f.mockReset();
    listVerifiedOptIn.mockResolvedValue(true);
  });

  it("writes the customer (verified by Google) and the same agreement record — no sign-up, no verify email", async () => {
    const customers = query({}), agreements = query({});
    from = fromQueue({ customers: [customers], account_agreements: [agreements] });
    const { finishGoogleAccount } = await import("@/lib/account/create");
    expect(await finishGoogleAccount(g)).toEqual({ ok: true });
    expect(callArgs(customers, "insert")?.[0]).toEqual({
      id: "g1", full_name: "Dana Whitfield", organization: "Whitfield Lab", verify_required: false, marketing_opt_in: true, email_verified_at: expect.any(String),
    });
    expect(callArgs(agreements, "insert")?.[0]).toMatchObject({ customer_id: "g1", age_21: true, ruo: true, dispute_policy: true, ip_hash: "h:1.2.3.4", user_agent: "UA" });
    expect(auth.signUp).not.toHaveBeenCalled();
    expect(checkDeliverable).not.toHaveBeenCalled();
    expect(sendVerifyEmail).not.toHaveBeenCalled();
    expect(recordOptIn).toHaveBeenCalledWith("dana@gmail.com", "SMITHLAB");
    expect(listVerifiedOptIn).toHaveBeenCalledWith("dana@gmail.com");
  });

  it("no opt-in: nothing on the list", async () => {
    from = fromQueue({ customers: [query({})], account_agreements: [query({})] });
    const { finishGoogleAccount } = await import("@/lib/account/create");
    await finishGoogleAccount({ ...g, optIn: false });
    expect(recordOptIn).not.toHaveBeenCalled();
    expect(listVerifiedOptIn).not.toHaveBeenCalled();
  });

  it("not a Google identity: refuses and writes nothing (non-Google unfinished users must sign up by email)", async () => {
    const customers = query({}), agreements = query({});
    from = fromQueue({ customers: [customers], account_agreements: [agreements] });
    const { finishGoogleAccount } = await import("@/lib/account/create");
    expect(await finishGoogleAccount({ ...g, emailVerified: false })).toEqual({ ok: false, error: "Please sign out and create your account with email." });
    expect(callArgs(customers, "insert")).toBeUndefined();
    expect(callArgs(agreements, "insert")).toBeUndefined();
    expect(sendVerifyEmail).not.toHaveBeenCalled();
    expect(recordOptIn).not.toHaveBeenCalled();
  });

  it("agreement not saved: removes the customer row (keeps the Google user) and fails", async () => {
    const del = query({});
    from = fromQueue({ customers: [query({}), del], account_agreements: [query({ error: { message: "down" } })] });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { finishGoogleAccount } = await import("@/lib/account/create");
    expect(await finishGoogleAccount(g)).toEqual({ ok: false, error: "We couldn't create your account — please try again." });
    expect(callArgs(del, "delete")).toBeDefined();
    expect(callArgs(del, "eq")).toEqual(["id", "g1"]);
    expect(deleteUser).not.toHaveBeenCalled();
    expect(recordOptIn).not.toHaveBeenCalled();
  });

  it("alerts the owner when the half-finished customer row can't be removed", async () => {
    from = fromQueue({ customers: [query({}), query({ error: { message: "down" } })], account_agreements: [query({ error: { message: "down" } })] });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { finishGoogleAccount } = await import("@/lib/account/create");
    expect((await finishGoogleAccount(g)).ok).toBe(false);
    expect(alertOwner).toHaveBeenCalledWith("Half-finished account not removed", expect.stringContaining("g1 dana@gmail.com"));
  });

  it("a duplicate customer row means it's already set up (double submit)", async () => {
    from = fromQueue({ customers: [query({ error: { code: "23505", message: "duplicate key" } })] });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { finishGoogleAccount } = await import("@/lib/account/create");
    expect(await finishGoogleAccount(g)).toEqual({ ok: false, error: "This account is already set up — reload the page." });
  });
});
