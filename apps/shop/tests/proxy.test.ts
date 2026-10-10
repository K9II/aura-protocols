import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const recordClickByCode = vi.fn();
vi.mock("@/lib/partners/data", () => ({ recordClickByCode }));

// getUser() only simulates a token refresh (calling the cookies.setAll the
// test passed via createServerClient) when a test opts in; the default
// no-op keeps the other tests' Set-Cookie output unaffected.
type RefreshCookie = { name: string; value: string; options: Record<string, unknown> };
let refreshOnGetUser: RefreshCookie[] | null = null;
vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _key: string, opts: { cookies: { setAll: (list: RefreshCookie[]) => void | Promise<void> } }) => ({
    auth: {
      getUser: async () => {
        if (refreshOnGetUser) await opts.cookies.setAll(refreshOnGetUser);
        return { data: { user: null }, error: null };
      },
    },
  }),
}));

const event = () => ({ waitUntil: vi.fn() });

describe("proxy referral links", () => {
  beforeEach(() => { vi.resetModules(); recordClickByCode.mockReset(); recordClickByCode.mockResolvedValue(undefined); process.env.PARTNER_REF_SECRET = "s"; refreshOnGetUser = null; });

  it("sets a signed 60-day aura_ref cookie and records the click", async () => {
    const { proxy } = await import("@/proxy");
    const ev = event();
    const res = await proxy(new NextRequest("http://localhost/products?ref=smithlab"), ev as never);
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/aura_ref=SMITHLAB\.\d+\./);
    expect(cookie).toMatch(/Max-Age=5184000/);
    expect(cookie.toLowerCase()).toContain("httponly");
    expect(ev.waitUntil).toHaveBeenCalledTimes(1);
    expect(recordClickByCode).toHaveBeenCalledWith("SMITHLAB");
  });

  it("ignores invalid or blocked codes", async () => {
    const { proxy } = await import("@/proxy");
    const res = await proxy(new NextRequest("http://localhost/?ref=aura-free"), event() as never);
    expect(res.headers.get("set-cookie") ?? "").not.toContain("aura_ref");
    expect(recordClickByCode).not.toHaveBeenCalled();
  });

  it("skips the cookie re-set and click when the incoming aura_ref cookie already matches", async () => {
    const { proxy } = await import("@/proxy");
    const { signRef } = await import("@/lib/partners/ref-cookie");
    const req = new NextRequest("http://localhost/products?ref=smithlab", {
      headers: { cookie: `aura_ref=${signRef("SMITHLAB")}` },
    });
    const res = await proxy(req, event() as never);
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(recordClickByCode).not.toHaveBeenCalled();
  });
});

describe("proxy session refresh — Remember me off", () => {
  beforeEach(() => {
    vi.resetModules(); recordClickByCode.mockReset(); recordClickByCode.mockResolvedValue(undefined);
    process.env.PARTNER_REF_SECRET = "s";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    refreshOnGetUser = null;
  });

  it("strips Max-Age from a refreshed session cookie when aura_session_only is set", async () => {
    refreshOnGetUser = [{ name: "sb-access-token", value: "refreshed", options: { path: "/", sameSite: "lax", maxAge: 34560000 } }];
    const { proxy } = await import("@/proxy");
    const req = new NextRequest("http://localhost/account", { headers: { cookie: "aura_session_only=1" } });
    const res = await proxy(req, event() as never);
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("sb-access-token=refreshed");
    expect(cookie).not.toMatch(/Max-Age/i);
  });

  it("keeps Max-Age on a refreshed session cookie when there is no marker cookie", async () => {
    refreshOnGetUser = [{ name: "sb-access-token", value: "refreshed", options: { path: "/", sameSite: "lax", maxAge: 34560000 } }];
    const { proxy } = await import("@/proxy");
    const req = new NextRequest("http://localhost/account");
    const res = await proxy(req, event() as never);
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/Max-Age=34560000/);
  });

  it("refreshes the session on /finish-account", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    refreshOnGetUser = [{ name: "sb-access-token", value: "refreshed", options: { path: "/", sameSite: "lax", maxAge: 34560000 } }];
    const { proxy } = await import("@/proxy");
    const res = await proxy(new NextRequest("http://localhost/finish-account?next=%2F"), event() as never);
    expect(res.headers.get("set-cookie") ?? "").toContain("sb-access-token=refreshed");
  });
});
