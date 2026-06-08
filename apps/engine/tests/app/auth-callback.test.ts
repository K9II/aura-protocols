import { describe, it, expect, vi, beforeEach } from "vitest";

const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({ auth: { exchangeCodeForSession } }),
}));

import { GET } from "@/app/auth/callback/route";

function callback(query: string) {
  return new Request(`http://localhost:3000/auth/callback${query}`);
}

describe("GET /auth/callback (shared by email OTP + Google OAuth)", () => {
  beforeEach(() => exchangeCodeForSession.mockClear());

  it("exchanges the OAuth/OTP code for a session and forwards to next", async () => {
    const res = await GET(callback("?code=abc123&next=/recommendation"));
    expect(exchangeCodeForSession).toHaveBeenCalledWith("abc123");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/recommendation");
  });

  it("defaults to /dashboard when next is absent", async () => {
    const res = await GET(callback("?code=abc123"));
    expect(res.headers.get("location")).toBe("http://localhost:3000/dashboard");
  });

  it("blocks open-redirect targets via safeNext", async () => {
    const res = await GET(callback("?code=abc123&next=//evil.com"));
    expect(res.headers.get("location")).toBe("http://localhost:3000/dashboard");
  });

  it("skips the code exchange when no code is present", async () => {
    const res = await GET(callback("?next=/dashboard"));
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(res.status).toBe(307);
  });
});
