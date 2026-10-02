import { describe, it, expect, vi, beforeEach } from "vitest";

const exchangeCodeForSession = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth: { exchangeCodeForSession } }) }));

describe("GET /auth/callback", () => {
  beforeEach(() => { vi.resetModules(); exchangeCodeForSession.mockReset(); });

  it("exchanges the code and redirects to the safe next path", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    const { GET } = await import("@/app/auth/callback/route");
    const res = await GET(new Request("http://localhost/auth/callback?code=abc&next=/checkout"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/checkout");
  });

  it("sends a failed or missing link back to sign-in", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: { message: "expired" } });
    const { GET } = await import("@/app/auth/callback/route");
    const res = await GET(new Request("http://localhost/auth/callback?code=abc&next=https://evil.example"));
    expect(res.headers.get("location")).toBe("http://localhost/sign-in?error=link");
  });
});
