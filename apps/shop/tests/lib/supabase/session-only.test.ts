import { describe, it, expect } from "vitest";
import { SESSION_ONLY_COOKIE, sessionCookieOptions } from "@/lib/supabase/session-only";

describe("sessionCookieOptions", () => {
  it("names the marker cookie", () => {
    expect(SESSION_ONLY_COOKIE).toBe("aura_session_only");
  });

  it("drops maxAge and expires for a real value when session-only", () => {
    expect(sessionCookieOptions({ path: "/", maxAge: 34560000, expires: new Date(0), sameSite: "lax" }, true, "tok"))
      .toEqual({ path: "/", sameSite: "lax" });
  });

  it("leaves options unchanged when not session-only", () => {
    const opts = { path: "/", maxAge: 34560000 };
    expect(sessionCookieOptions(opts, false, "tok")).toBe(opts);
  });

  it("keeps a delete's maxAge: 0 even when session-only", () => {
    const opts = { path: "/", maxAge: 0 };
    expect(sessionCookieOptions(opts, true, "")).toBe(opts);
  });
});
