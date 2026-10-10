import { describe, it, expect, vi, beforeEach } from "vitest";

const setMock = vi.fn();
let cookieJar: Record<string, string> = {};
vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => Object.entries(cookieJar).map(([name, value]) => ({ name, value })),
    get: (name: string) => (cookieJar[name] !== undefined ? { name, value: cookieJar[name] } : undefined),
    set: setMock,
  }),
}));
vi.mock("@/lib/supabase/env", () => ({ publicSupabaseEnv: () => ({ url: "https://x.supabase.co", anonKey: "anon" }) }));

let capturedCookies: { setAll: (list: { name: string; value: string; options?: Record<string, unknown> }[]) => void } | undefined;
vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _key: string, opts: { cookies: typeof capturedCookies }) => {
    capturedCookies = opts.cookies;
    return {};
  },
}));

describe("createSupabaseServerClient", () => {
  beforeEach(() => { vi.resetModules(); setMock.mockReset(); cookieJar = {}; capturedCookies = undefined; });

  it("writes session cookies without Max-Age when aura_session_only is set", async () => {
    cookieJar.aura_session_only = "1";
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    await createSupabaseServerClient();
    capturedCookies!.setAll([{ name: "sb-token", value: "tok", options: { path: "/", maxAge: 34560000, sameSite: "lax" } }]);
    expect(setMock).toHaveBeenCalledWith("sb-token", "tok", { path: "/", sameSite: "lax" });
  });

  it("keeps a delete's Max-Age: 0 even when aura_session_only is set", async () => {
    cookieJar.aura_session_only = "1";
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    await createSupabaseServerClient();
    capturedCookies!.setAll([{ name: "sb-token", value: "", options: { path: "/", maxAge: 0 } }]);
    expect(setMock).toHaveBeenCalledWith("sb-token", "", { path: "/", maxAge: 0 });
  });

  it("an explicit sessionOnly: false overrides the marker cookie", async () => {
    cookieJar.aura_session_only = "1";
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    await createSupabaseServerClient({ sessionOnly: false });
    capturedCookies!.setAll([{ name: "sb-token", value: "tok", options: { path: "/", maxAge: 34560000 } }]);
    expect(setMock).toHaveBeenCalledWith("sb-token", "tok", { path: "/", maxAge: 34560000 });
  });

  it("keeps full options when there is no marker cookie and no explicit opts", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    await createSupabaseServerClient();
    capturedCookies!.setAll([{ name: "sb-token", value: "tok", options: { path: "/", maxAge: 34560000 } }]);
    expect(setMock).toHaveBeenCalledWith("sb-token", "tok", { path: "/", maxAge: 34560000 });
  });
});
