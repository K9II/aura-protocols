import { describe, it, expect, vi, beforeEach } from "vitest";

const consumeVerifyToken = vi.fn(), alertOwner = vi.fn();
vi.mock("@/lib/account/verify", () => ({ consumeVerifyToken }));
vi.mock("@/lib/notify", () => ({ alertOwner }));
vi.mock("@/lib/supabase/env", () => ({ siteUrl: () => "https://auraprotocols.com" }));
const get = (q: string) => new Request(`https://auraprotocols.com/auth/verify${q}`);

describe("GET /auth/verify", () => {
  beforeEach(() => { vi.resetModules(); consumeVerifyToken.mockReset(); alertOwner.mockReset(); });

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
});
