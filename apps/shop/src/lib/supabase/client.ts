"use client";
import { createBrowserClient } from "@supabase/ssr";
import { publicSupabaseEnv } from "@/lib/supabase/env";
import { SESSION_ONLY_COOKIE, sessionCookieOptions } from "@/lib/supabase/session-only";

type RawCookieOptions = {
  path?: string; domain?: string; maxAge?: number; expires?: Date | string | number;
  sameSite?: "strict" | "lax" | "none" | boolean; secure?: boolean;
};

// document.cookie gives one "a=1; b=2" string with no way to tell apart a
// value that legitimately contains "; " from a cookie boundary, same
// limitation the `cookie` package's own parser has.
function parseDocumentCookies(cookieStr: string): { name: string; value: string }[] {
  if (!cookieStr) return [];
  return cookieStr.split(";").map((pair) => {
    const eq = pair.indexOf("=");
    const name = (eq === -1 ? pair : pair.slice(0, eq)).trim();
    const raw = eq === -1 ? "" : pair.slice(eq + 1).trim();
    let value = raw;
    try { value = decodeURIComponent(raw); } catch { /* leave as-is on bad encoding */ }
    return { name, value };
  }).filter((c) => c.name);
}

// Minimal Set-Cookie string for the options @supabase/ssr actually passes
// (path, maxAge, expires, sameSite, secure, domain) — httpOnly is dropped;
// a browser script cannot set it anyway.
function serializeCookie(name: string, value: string, options: RawCookieOptions = {}): string {
  let str = `${name}=${encodeURIComponent(value)}`;
  if (options.domain) str += `; Domain=${options.domain}`;
  str += `; Path=${options.path ?? "/"}`;
  if (typeof options.maxAge === "number") str += `; Max-Age=${Math.floor(options.maxAge)}`;
  if (options.expires) {
    const d = options.expires instanceof Date ? options.expires : new Date(options.expires);
    str += `; Expires=${d.toUTCString()}`;
  }
  if (options.sameSite) {
    const named = options.sameSite === true ? "strict" : options.sameSite;
    str += `; SameSite=${named.charAt(0).toUpperCase()}${named.slice(1)}`;
  }
  if (options.secure) str += "; Secure";
  return str;
}

export function createSupabaseBrowserClient() {
  const { url, anonKey } = publicSupabaseEnv();
  return createBrowserClient(url, anonKey, {
    cookies: {
      getAll: () => parseDocumentCookies(document.cookie),
      setAll: (list) => {
        // "Remember me" unchecked: the marker cookie gateSignInAction set is
        // itself readable here (not httpOnly) so a token refresh in the
        // browser also writes session-only cookies, not 400-day ones.
        const sessionOnly = parseDocumentCookies(document.cookie).some((c) => c.name === SESSION_ONLY_COOKIE && c.value === "1");
        for (const { name, value, options } of list) {
          document.cookie = serializeCookie(name, value, sessionCookieOptions((options ?? {}) as RawCookieOptions, sessionOnly, value));
        }
      },
    },
  });
}
