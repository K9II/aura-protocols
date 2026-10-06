"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SESSION_ONLY_COOKIE } from "@/lib/supabase/session-only";
import { siteUrl } from "@/lib/supabase/env";
import { safeNext } from "@/lib/dal";
import { alertOwner } from "@/lib/notify";

// "Continue with Google" (/sign-in and the gate). PKCE: @supabase/ssr stores
// the code verifier in a cookie here; /auth/callback exchanges the code.
// Google sign-ins are persistent sessions, so the "Remember me" marker goes.
export async function startGoogleAction(form: FormData): Promise<void> {
  const next = safeNext(String(form.get("next") ?? ""), "/account");
  const supabase = await createSupabaseServerClient({ sessionOnly: false });
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl()}/auth/callback?flow=google&next=${encodeURIComponent(next)}`,
      queryParams: { prompt: "select_account" }, // "Not you?" can pick another Google account
    },
  });
  const url = data?.url;
  if (error || !url) {
    await alertOwner("Google sign-in unavailable", `signInWithOAuth: ${JSON.stringify(error)}`);
    redirect(`/sign-in?error=google&next=${encodeURIComponent(next)}`);
  }
  (await cookies()).delete(SESSION_ONLY_COOKIE);
  redirect(url); // redirect() takes absolute URLs (Next 16 docs: functions/redirect.md)
}
