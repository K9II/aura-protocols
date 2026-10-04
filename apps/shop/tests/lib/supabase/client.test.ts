import { describe, it, expect, vi, beforeEach } from "vitest";

type CapturedCookies = {
  getAll: () => { name: string; value: string }[];
  setAll: (list: { name: string; value: string; options?: Record<string, unknown> }[]) => void;
};
let captured: CapturedCookies | undefined;
vi.mock("@supabase/ssr", () => ({
  createBrowserClient: (_url: string, _key: string, opts: { cookies: CapturedCookies }) => { captured = opts.cookies; return {}; },
}));

function clearAllCookies() {
  document.cookie.split(";").forEach((c) => {
    const name = c.split("=")[0]?.trim();
    if (name) document.cookie = `${name}=; Max-Age=0; Path=/`;
  });
}

describe("createSupabaseBrowserClient cookies", () => {
  beforeEach(() => {
    vi.resetModules();
    captured = undefined;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    clearAllCookies();
  });

  it("reads document.cookie via getAll", async () => {
    document.cookie = "aura_session_only=1; Path=/";
    const { createSupabaseBrowserClient } = await import("@/lib/supabase/client");
    createSupabaseBrowserClient();
    expect(captured!.getAll()).toEqual(expect.arrayContaining([{ name: "aura_session_only", value: "1" }]));
  });

  it("writes a cookie without Max-Age when aura_session_only=1 is present", async () => {
    document.cookie = "aura_session_only=1; Path=/";
    const { createSupabaseBrowserClient } = await import("@/lib/supabase/client");
    createSupabaseBrowserClient();
    const setSpy = vi.spyOn(document, "cookie", "set");
    captured!.setAll([{ name: "sb-token", value: "tok", options: { path: "/", maxAge: 34560000, sameSite: "lax" } }]);
    expect(setSpy).toHaveBeenCalledWith(expect.stringContaining("sb-token=tok"));
    expect(setSpy).toHaveBeenCalledWith(expect.not.stringContaining("Max-Age"));
  });

  it("keeps Max-Age when there is no session-only marker", async () => {
    const { createSupabaseBrowserClient } = await import("@/lib/supabase/client");
    createSupabaseBrowserClient();
    const setSpy = vi.spyOn(document, "cookie", "set");
    captured!.setAll([{ name: "sb-token", value: "tok", options: { path: "/", maxAge: 34560000, sameSite: "lax" } }]);
    expect(setSpy).toHaveBeenCalledWith(expect.stringContaining("Max-Age=34560000"));
  });
});
