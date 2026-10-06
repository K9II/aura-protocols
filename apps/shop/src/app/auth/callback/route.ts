import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { customerStatus, safeNext } from "@/lib/dal";
import { alertOwner } from "@/lib/notify";

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
    if (google && err && err !== "access_denied") await alertOwner("Google sign-in failed", `${err}: ${q.get("error_description") ?? ""}`);
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
  if (status === "none") return go(`/finish-account?next=${encodeURIComponent(next)}`);
  return go(next);
}
