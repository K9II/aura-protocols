import { describe, it, expect, vi, beforeEach } from "vitest";

const signInWithOAuth = vi.fn(), cookieDelete = vi.fn(), alertOwner = vi.fn();
let clientOpts: unknown;
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async (opts: unknown) => { clientOpts = opts; return { auth: { signInWithOAuth } }; } }));
vi.mock("@/lib/supabase/env", () => ({ siteUrl: () => "http://localhost:3100" }));
vi.mock("@/lib/notify", () => ({ alertOwner }));
vi.mock("next/headers", () => ({ cookies: async () => ({ delete: cookieDelete }) }));
vi.mock("next/navigation", () => ({ redirect: (u: string) => { throw new Error(`REDIRECT:${u}`); } }));

const fd = (next: string) => { const f = new FormData(); f.set("next", next); return f; };

describe("startGoogleAction", () => {
  beforeEach(() => { vi.resetModules(); for (const f of [signInWithOAuth, cookieDelete, alertOwner]) f.mockReset(); clientOpts = undefined; });

  it("starts Google OAuth back to /auth/callback (flow=google, safe next) and redirects to Google", async () => {
    signInWithOAuth.mockResolvedValue({ data: { provider: "google", url: "https://accounts.google.com/o/oauth2/v2/auth?x=1" }, error: null });
    const { startGoogleAction } = await import("@/app/auth/google-actions");
    await expect(startGoogleAction(fd("/products"))).rejects.toThrow("REDIRECT:https://accounts.google.com/o/oauth2/v2/auth?x=1");
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: "http://localhost:3100/auth/callback?flow=google&next=%2Fproducts", queryParams: { prompt: "select_account" } },
    });
    expect(clientOpts).toEqual({ sessionOnly: false });
    expect(cookieDelete).toHaveBeenCalledWith("aura_session_only");
  });

  it("keeps the query string of a safe next", async () => {
    signInWithOAuth.mockResolvedValue({ data: { url: "https://accounts.google.com/o/oauth2/auth?x=1" }, error: null });
    const { startGoogleAction } = await import("@/app/auth/google-actions");
    await expect(startGoogleAction(fd("/products?cat=a"))).rejects.toThrow("REDIRECT:");
    expect(signInWithOAuth.mock.calls[0][0].options.redirectTo).toBe("http://localhost:3100/auth/callback?flow=google&next=%2Fproducts%3Fcat%3Da");
  });

  it("an unsafe next becomes /account", async () => {
    signInWithOAuth.mockResolvedValue({ data: { url: "https://accounts.google.com/x" }, error: null });
    const { startGoogleAction } = await import("@/app/auth/google-actions");
    await expect(startGoogleAction(fd("https://evil.example"))).rejects.toThrow(/REDIRECT:/);
    expect(signInWithOAuth.mock.calls[0][0].options.redirectTo).toBe("http://localhost:3100/auth/callback?flow=google&next=%2Faccount");
  });

  it("a start failure is loud and lands on the sign-in page's Google message", async () => {
    signInWithOAuth.mockResolvedValue({ data: { url: null }, error: { message: "provider is not enabled" } });
    const { startGoogleAction } = await import("@/app/auth/google-actions");
    await expect(startGoogleAction(fd("/products"))).rejects.toThrow("REDIRECT:/sign-in?error=google&next=%2Fproducts");
    expect(alertOwner).toHaveBeenCalledWith("Google sign-in unavailable", expect.stringContaining("provider is not enabled"));
  });
});
