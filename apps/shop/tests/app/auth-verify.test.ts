import { describe, it, expect, vi, beforeEach } from "vitest";

const consumeVerifyToken = vi.fn(), alertOwner = vi.fn();
const confirmOptIn = vi.fn(), sendTracked = vi.fn(), offerForEmail = vi.fn();
vi.mock("@/lib/account/verify", () => ({ consumeVerifyToken }));
vi.mock("@/lib/notify", () => ({ alertOwner }));
vi.mock("@/lib/supabase/env", () => ({ siteUrl: () => "https://auraprotocols.com" }));
vi.mock("@/lib/email/data", () => ({ confirmOptIn, sendTracked }));
vi.mock("@/lib/account/offer-data", () => ({ offerForEmail }));
const get = (q: string) => new Request(`https://auraprotocols.com/auth/verify${q}`);

describe("GET /auth/verify", () => {
  beforeEach(() => {
    vi.resetModules();
    consumeVerifyToken.mockReset(); alertOwner.mockReset();
    confirmOptIn.mockReset(); sendTracked.mockReset(); offerForEmail.mockReset();
    process.env.EMAIL_LINK_SECRET = "s"; process.env.MAILING_ADDRESS = "Aura Protocols LLC · 1 A St";
  });

  it("sends a missing or bad token to the invalid state", async () => {
    consumeVerifyToken.mockResolvedValue(null);
    const { GET } = await import("@/app/auth/verify/route");
    expect((await GET(get(""))).headers.get("location")).toBe("https://auraprotocols.com/verified?state=invalid");
    expect((await GET(get("?token=x"))).headers.get("location")).toBe("https://auraprotocols.com/verified?state=invalid");
  });

  it("lands on /verified after a good token", async () => {
    consumeVerifyToken.mockResolvedValue({ customerId: "u1", email: "j@lab.org", optIn: false, already: false });
    const { GET } = await import("@/app/auth/verify/route");
    expect((await GET(get("?token=t"))).headers.get("location")).toBe("https://auraprotocols.com/verified");
  });

  it("alerts the owner and shows the error state when verification throws", async () => {
    consumeVerifyToken.mockRejectedValue(new Error("db down"));
    const { GET } = await import("@/app/auth/verify/route");
    expect((await GET(get("?token=t"))).headers.get("location")).toBe("https://auraprotocols.com/verified?state=error");
    expect(alertOwner).toHaveBeenCalled();
  });

  it("an opted-in account's first verification confirms the list signup and sends File 01", async () => {
    consumeVerifyToken.mockResolvedValue({ customerId: "u1", email: "j@lab.org", optIn: true, already: false });
    confirmOptIn.mockResolvedValue(true); sendTracked.mockResolvedValue("sent"); offerForEmail.mockResolvedValue({ endsAt: "2026-10-18T23:59:59.999Z" });
    const { GET } = await import("@/app/auth/verify/route");
    expect((await GET(get("?token=t"))).headers.get("location")).toBe("https://auraprotocols.com/verified?state=listed");
    expect(confirmOptIn).toHaveBeenCalledWith("j@lab.org");
    expect(sendTracked.mock.calls[0][0]).toMatchObject({ email: "j@lab.org", kind: "welcome_1", ref: null });
  });

  it("a repeat click never re-sends File 01", async () => {
    consumeVerifyToken.mockResolvedValue({ customerId: "u1", email: "j@lab.org", optIn: true, already: true });
    const { GET } = await import("@/app/auth/verify/route");
    await GET(get("?token=t"));
    expect(confirmOptIn).not.toHaveBeenCalled();
    expect(sendTracked).not.toHaveBeenCalled();
  });

  it("verification still succeeds when File 01 fails; the owner is told and the hourly run retries", async () => {
    consumeVerifyToken.mockResolvedValue({ customerId: "u1", email: "j@lab.org", optIn: true, already: false });
    confirmOptIn.mockResolvedValue(true); offerForEmail.mockResolvedValue(null); sendTracked.mockRejectedValue(new Error("ses down"));
    const { GET } = await import("@/app/auth/verify/route");
    expect((await GET(get("?token=t"))).headers.get("location")).toBe("https://auraprotocols.com/verified?state=listed");
    expect(alertOwner).toHaveBeenCalled();
  });

  it("lands on plain /verified without sending when confirmOptIn finds nothing to confirm", async () => {
    consumeVerifyToken.mockResolvedValue({ customerId: "u1", email: "j@lab.org", optIn: true, already: false });
    confirmOptIn.mockResolvedValue(false);
    const { GET } = await import("@/app/auth/verify/route");
    expect((await GET(get("?token=t"))).headers.get("location")).toBe("https://auraprotocols.com/verified");
    expect(sendTracked).not.toHaveBeenCalled();
  });

  it("alerts separately and lands on plain /verified when confirmOptIn itself throws (the row stays pending, nothing retries it)", async () => {
    consumeVerifyToken.mockResolvedValue({ customerId: "u1", email: "j@lab.org", optIn: true, already: false });
    confirmOptIn.mockRejectedValue(new Error("db down"));
    const { GET } = await import("@/app/auth/verify/route");
    expect((await GET(get("?token=t"))).headers.get("location")).toBe("https://auraprotocols.com/verified");
    expect(sendTracked).not.toHaveBeenCalled();
    expect(alertOwner).toHaveBeenCalledWith("Opt-in not confirmed at verification", "j@lab.org: Error: db down — still pending; confirm it manually");
  });
});
