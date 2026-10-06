import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { validateCode } from "@/lib/partners/codes";
import { REF_COOKIE, REF_MAX_AGE_S, readRef, signRef } from "@/lib/partners/ref-cookie";
import { recordClickByCode } from "@/lib/partners/data";
import { SESSION_ONLY_COOKIE, sessionCookieOptions } from "@/lib/supabase/session-only";

// 1) Refreshes the Supabase session on signed-in routes only (authorization
//    stays in lib/dal.ts). 2) On any page, a valid ?ref=CODE sets the signed
//    60-day referral cookie and counts the click after the response.
const SESSION_PREFIXES = ["/account", "/checkout", "/order", "/admin", "/partners", "/reset-password", "/finish-account"];

// Logged once per server process, not per request, if PARTNER_REF_SECRET is
// missing — the cookie is simply skipped so no page ever crashes on it.
let warnedMissingRefSecret = false;

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  let response = NextResponse.next({ request });
  const { pathname, searchParams } = request.nextUrl;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && anonKey && SESSION_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    // A background token refresh here must respect "Remember me" too — read
    // from the request cookie, since this is the visitor's inbound session.
    const sessionOnly = request.cookies.get(SESSION_ONLY_COOKIE)?.value === "1";
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          for (const { name, value } of list) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of list) response.cookies.set(name, value, sessionCookieOptions(options ?? {}, sessionOnly, value));
        },
      },
    });
    await supabase.auth.getUser();
  }

  const ref = searchParams.get("ref");
  const check = ref ? validateCode(ref) : null;
  if (check?.ok) {
    // A returning visitor re-clicking their own already-set link shouldn't
    // re-write the cookie or count another click.
    let alreadyMatches = false;
    try {
      alreadyMatches = readRef(request.cookies.get(REF_COOKIE)?.value) === check.code;
    } catch {
      alreadyMatches = false;
    }
    if (!alreadyMatches) {
      if (process.env.PARTNER_REF_SECRET) {
        response.cookies.set(REF_COOKIE, signRef(check.code), {
          httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: REF_MAX_AGE_S, path: "/",
        });
        event.waitUntil(recordClickByCode(check.code).catch((err) => console.error("partner click not recorded:", err)));
      } else if (!warnedMissingRefSecret) {
        warnedMissingRefSecret = true;
        console.error("PARTNER_REF_SECRET is not set; skipping the aura_ref referral cookie");
      }
    }
  }
  return response;
}

export const config = {
  // Every page (so ?ref= works anywhere), but not static assets or API routes.
  matcher: ["/((?!_next/static|_next/image|api/|favicon\\.ico|.*\\.[a-zA-Z0-9]+$).*)"],
};
