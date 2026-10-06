import { describe, it, expect, vi, beforeEach } from "vitest";

const confirmOptIn = vi.fn(), sendTracked = vi.fn(), offerForEmail = vi.fn(), alertOwner = vi.fn();
vi.mock("@/lib/email/data", () => ({ confirmOptIn, sendTracked }));
vi.mock("@/lib/account/offer-data", () => ({ offerForEmail }));
vi.mock("@/lib/notify", () => ({ alertOwner }));
vi.mock("@/lib/supabase/env", () => ({ siteUrl: () => "https://auraprotocols.com" }));

describe("listVerifiedOptIn", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const f of [confirmOptIn, sendTracked, offerForEmail, alertOwner]) f.mockReset();
    offerForEmail.mockResolvedValue(null);
    process.env.EMAIL_LINK_SECRET = "s"; process.env.MAILING_ADDRESS = "Aura Protocols LLC · 1 A St";
  });

  it("confirms a pending opt-in and sends Welcome File 01", async () => {
    confirmOptIn.mockResolvedValue(true);
    const { listVerifiedOptIn } = await import("@/lib/account/welcome");
    expect(await listVerifiedOptIn("dana@gmail.com")).toBe(true);
    expect(confirmOptIn).toHaveBeenCalledWith("dana@gmail.com");
    expect(sendTracked).toHaveBeenCalledWith(expect.objectContaining({ email: "dana@gmail.com", kind: "welcome_1", ref: null }));
  });

  it("nothing pending: no send", async () => {
    confirmOptIn.mockResolvedValue(false);
    const { listVerifiedOptIn } = await import("@/lib/account/welcome");
    expect(await listVerifiedOptIn("dana@gmail.com")).toBe(false);
    expect(sendTracked).not.toHaveBeenCalled();
  });

  it("never throws: a failed confirm or send alerts the owner", async () => {
    confirmOptIn.mockRejectedValueOnce(new Error("db down"));
    const { listVerifiedOptIn } = await import("@/lib/account/welcome");
    expect(await listVerifiedOptIn("dana@gmail.com")).toBe(false);
    expect(alertOwner).toHaveBeenCalledWith("Opt-in not confirmed at verification", expect.stringContaining("dana@gmail.com"));
    confirmOptIn.mockResolvedValue(true); sendTracked.mockRejectedValue(new Error("ses down"));
    expect(await listVerifiedOptIn("dana@gmail.com")).toBe(true);
    expect(alertOwner).toHaveBeenCalledWith("Welcome File 01 failed at verification", expect.stringContaining("dana@gmail.com"));
  });
});
