import { describe, it, expect, vi, beforeEach } from "vitest";
import { query, fromQueue, callArgs } from "../../helpers/supabase-mock";

const updateUserById = vi.fn(), alertOwner = vi.fn();
let from: ReturnType<typeof fromQueue>;
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: (t: string) => from(t), auth: { admin: { updateUserById } } }) }));
vi.mock("@/lib/notify", () => ({ alertOwner }));

describe("secureGoogleLink (a Google sign-in on a user that also has a password)", () => {
  beforeEach(() => {
    vi.resetModules();
    updateUserById.mockReset(); alertOwner.mockReset();
    updateUserById.mockResolvedValue({ data: {}, error: null });
  });

  it("a customer who already confirmed their email keeps everything (they proved the address first)", async () => {
    from = fromQueue({ customers: [query({ data: { id: "u1", email_verified_at: "2026-10-01T00:00:00Z" } })] });
    const { secureGoogleLink } = await import("@/lib/account/google-link");
    expect(await secureGoogleLink("u1")).toEqual({ ok: true, changed: false });
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it("an unconfirmed customer: the old password is replaced with a random one, then the email is marked confirmed", async () => {
    const read = query({ data: { id: "u1", email_verified_at: null } }), upd = query({});
    from = fromQueue({ customers: [read, upd] });
    const { secureGoogleLink } = await import("@/lib/account/google-link");
    expect(await secureGoogleLink("u1")).toEqual({ ok: true, changed: true });
    expect(updateUserById).toHaveBeenCalledTimes(1);
    const [id, attrs] = updateUserById.mock.calls[0];
    expect(id).toBe("u1");
    expect(typeof attrs.password).toBe("string");
    expect(attrs.password).toHaveLength(48);
    expect(callArgs(upd, "update")?.[0]).toEqual({ email_verified_at: expect.any(String), verify_required: false });
    expect(callArgs(upd, "eq")).toEqual(["id", "u1"]);
    expect(callArgs(upd, "is")).toEqual(["email_verified_at", null]);
  });

  it("two calls never pick the same password", async () => {
    from = fromQueue({ customers: [query({ data: null }), query({ data: null })] });
    const { secureGoogleLink } = await import("@/lib/account/google-link");
    await secureGoogleLink("u1"); await secureGoogleLink("u1");
    expect(updateUserById.mock.calls[0][1].password).not.toBe(updateUserById.mock.calls[1][1].password);
  });

  it("no customer row yet (pre-made auth user): the password is still replaced", async () => {
    from = fromQueue({ customers: [query({ data: null })] });
    const { secureGoogleLink } = await import("@/lib/account/google-link");
    expect(await secureGoogleLink("u1")).toEqual({ ok: true, changed: true });
    expect(updateUserById).toHaveBeenCalledWith("u1", { password: expect.any(String) });
  });

  it("the password can't be replaced: not ok (the caller signs the user out)", async () => {
    from = fromQueue({ customers: [query({ data: { id: "u1", email_verified_at: null } })] });
    updateUserById.mockResolvedValue({ data: null, error: { message: "down" } });
    const { secureGoogleLink } = await import("@/lib/account/google-link");
    expect(await secureGoogleLink("u1")).toEqual({ ok: false, error: expect.stringContaining("down") });
  });

  it("the customer can't be read: not ok, nothing changed", async () => {
    from = fromQueue({ customers: [query({ error: { message: "read down" } })] });
    const { secureGoogleLink } = await import("@/lib/account/google-link");
    expect(await secureGoogleLink("u1")).toEqual({ ok: false, error: expect.stringContaining("read down") });
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it("marking the email confirmed fails after the password is gone: loud, but the sign-in is safe", async () => {
    from = fromQueue({ customers: [query({ data: { id: "u1", email_verified_at: null } }), query({ error: { message: "upd down" } })] });
    const { secureGoogleLink } = await import("@/lib/account/google-link");
    expect(await secureGoogleLink("u1")).toEqual({ ok: true, changed: true });
    expect(alertOwner).toHaveBeenCalledWith("Google sign-in: email not marked confirmed", expect.stringContaining("u1"));
  });
});

describe("confirmGoogleEmail (Google proved the address)", () => {
  beforeEach(() => { vi.resetModules(); });

  it("marks an unconfirmed customer confirmed and drops the verify step, only if still unconfirmed", async () => {
    const upd = query({});
    from = fromQueue({ customers: [upd] });
    const { confirmGoogleEmail } = await import("@/lib/account/google-link");
    await confirmGoogleEmail("u1");
    expect(callArgs(upd, "update")?.[0]).toEqual({ email_verified_at: expect.any(String), verify_required: false });
    expect(callArgs(upd, "eq")).toEqual(["id", "u1"]);
    expect(callArgs(upd, "is")).toEqual(["email_verified_at", null]);
  });

  it("a DB error throws (the caller alerts)", async () => {
    from = fromQueue({ customers: [query({ error: { message: "down" } })] });
    const { confirmGoogleEmail } = await import("@/lib/account/google-link");
    await expect(confirmGoogleEmail("u1")).rejects.toThrow(/confirm google email/);
  });
});
