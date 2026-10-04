import { describe, it, expect, vi, beforeEach } from "vitest";

const getCustomer = vi.fn(), sendVerifyEmail = vi.fn(), lastVerifySentAt = vi.fn(), alertOwner = vi.fn();
vi.mock("@/lib/dal", () => ({ getCustomer }));
vi.mock("@/lib/account/verify", () => ({ sendVerifyEmail, lastVerifySentAt }));
vi.mock("@/lib/notify", () => ({ alertOwner }));

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
