import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { customerStatus, safeNext } from "@/lib/dal";
import { alertOwner } from "@/lib/notify";
import { confirmGoogleEmail, secureGoogleLink } from "@/lib/account/google-link";

// @supabase/ssr sets this (PKCE) when a browser starts a Google sign-in.
// A provider error without it is just someone hitting the URL — no alert.
const VERIFIER_COOKIE = /(?:^|;)\s*[^=;\s]+-auth-token-code-verifier(?:\.\d+)?=/;
function startedHere(request: Request): boolean {
  return VERIFIER_COOKIE.test(request.headers.get("cookie") ?? "");
}

// Belt and braces when a session must not survive: expire every Supabase
// session cookie (sb-<ref>-auth-token and its .0/.1 chunks) on the response.
const SESSION_COOKIE = /-auth-token(?:\.\d+)?$/;
function clearSessionCookies(request: Request, res: NextResponse): NextResponse {
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const name = part.split("=")[0].trim();
    if (name && SESSION_COOKIE.test(name)) res.cookies.set(name, "", { path: "/", maxAge: 0 });
  }
  return res;
}

// Lands here with a one-time code: reset-password links, and "Continue with
// Google" (flow=google, from app/auth/google-actions.ts). A signed-in user
// with no customers row finishes their account first (/finish-account).
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const q = url.searchParams;
  const go = (path: string) => NextResponse.redirect(new URL(path, url.origin));
  const google = q.get("flow") === "google";
  const failed = google ? "/sign-in?error=google" : "/sign-in?error=link";

  // A blocked (banned) account: Supabase refuses the sign-in.
  if (q.get("error_code") === "user_banned") return go("/sign-in?error=closed");
  const code = q.get("code");
  if (!code) {
    const err = q.get("error");
    // access_denied = the visitor cancelled at Google; anything else is ours to fix.
    if (google && err && err !== "access_denied" && startedHere(request)) await alertOwner("Google sign-in failed", `${err}: ${q.get("error_description") ?? ""}`);
    return go(failed);
  }

  const next = safeNext(q.get("next"));
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if ((error as { code?: string } | null)?.code === "user_banned") return go("/sign-in?error=closed");
  if (error || !data?.user) return go(failed);

  let status: Awaited<ReturnType<typeof customerStatus>>;
  try {
    status = await customerStatus(data.user.id);
  } catch (err) {
    await alertOwner("Sign-in account check failed", `${data.user.id}: ${String(err)}`);
    return go(failed);
  }
  if (status === "blocked") {
    // Harmless if it fails: the DAL treats a blocked account as signed out anyway.
    try { await supabase.auth.signOut({ scope: "local" }); } catch { /* ignore */ }
    return go("/sign-in?error=closed");
  }
  // Google on a user that also has a password: Google just proved the
  // address, so a password set by someone who never confirmed it must go
  // (lib/account/google-link.ts). If that can't be done, no session.
  if (google && (data.user.identities ?? []).some((i) => i.provider === "email")) {
    let problem: string | null;
    try {
      const r = await secureGoogleLink(data.user.id);
      problem = r.ok ? null : r.error;
    } catch (err) {
      problem = String(err);
    }
    if (problem !== null) {
      await alertOwner("Google sign-in: old password not removed", `${data.user.id}: ${problem}`);
      try { await supabase.auth.signOut({ scope: "local" }); } catch { /* the cookies are cleared below either way */ }
      return clearSessionCookies(request, go(failed));
    }
  } else if (google && status === "ok") {
    // Google-only now (Supabase drops an unconfirmed email login on a Google
    // sign-in with the same address): Google proved it, so confirm it here.
    // A failure only means a verify step remains — loud, but sign-in goes on.
    try { await confirmGoogleEmail(data.user.id); }
    catch (err) { await alertOwner("Google sign-in: email not marked confirmed", `${data.user.id}: ${String(err)}`); }
  }
  if (status === "none") return go(`/finish-account?next=${encodeURIComponent(next)}`);
  return go(next);
}
