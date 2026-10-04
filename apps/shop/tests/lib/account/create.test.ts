import { describe, it, expect, vi, beforeEach } from "vitest";
import { query, fromQueue, callArgs } from "../../helpers/supabase-mock";

const auth = { signUp: vi.fn() };
const deleteUser = vi.fn(), checkDeliverable = vi.fn(), signupsFromIpSince = vi.fn(), sendVerifyEmail = vi.fn(), recordOptIn = vi.fn(), alertOwner = vi.fn();
let from: ReturnType<typeof fromQueue>;
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth }) }));
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: (t: string) => from(t), auth: { admin: { deleteUser } } }) }));
vi.mock("@/lib/gate", () => ({ hashIp: (ip: string) => `h:${ip}` }));
vi.mock("@/lib/account/deliverable", () => ({ checkDeliverable }));
vi.mock("@/lib/account/data", () => ({ signupsFromIpSince }));
vi.mock("@/lib/account/verify", () => ({ sendVerifyEmail }));
vi.mock("@/lib/email/data", () => ({ recordOptIn }));
vi.mock("@/lib/notify", () => ({ alertOwner }));

const base = { fullName: "Jane Rivera", email: "jane@lab.org", password: "correct horse battery", organization: null, optIn: false, ip: "1.2.3.4", userAgent: "UA", deviceFlagged: false, partnerRef: null };

describe("createAccount", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const f of [auth.signUp, deleteUser, checkDeliverable, signupsFromIpSince, sendVerifyEmail, recordOptIn, alertOwner]) f.mockReset();
    checkDeliverable.mockResolvedValue("ok"); signupsFromIpSince.mockResolvedValue(0);
    auth.signUp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
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

  it("keeps the account but alerts the owner when the verify email or opt-in fails", async () => {
    from = fromQueue({ customers: [query({})], account_agreements: [query({})] });
    sendVerifyEmail.mockRejectedValue(new Error("ses down")); recordOptIn.mockRejectedValue(new Error("db down"));
    const { createAccount } = await import("@/lib/account/create");
    expect((await createAccount({ ...base, optIn: true })).ok).toBe(true);
    expect(alertOwner).toHaveBeenCalledTimes(2);
  });
});
