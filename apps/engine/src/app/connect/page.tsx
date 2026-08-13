import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import SignInForm from "./SignInForm";

export const runtime = "nodejs";

export default async function ConnectPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="pharmacopoeia">
        <div className="p-container max-w-md py-16">
          <h1 className="p-serif text-3xl">Sign in to continue</h1>
          <p className="mt-3 text-[color:var(--ink-soft)]">We email you a one-time link. No password. We store your fitness data, not PHI.</p>
          <div className="mt-6">
            <Suspense fallback={null}>
              <SignInForm />
            </Suspense>
          </div>
        </div>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_complete")
    .eq("id", user.id)
    .maybeSingle();

  // Can't connect meaningfully without a profile (consistent with PR #4 gating
  // manual upload on onboarding). This is a real gate, not state encoding.
  if (!profile?.onboarding_complete) redirect("/onboarding");

  return (
    <div className="pharmacopoeia">
      <div className="p-container max-w-md py-16">
        <a href="/dashboard" className="p-link text-sm">← Back to dashboard</a>
        <h1 className="mt-4 p-serif text-3xl">Connect your wearable</h1>
        <div className="mt-6 p-callout border border-[color:var(--line)] px-6 py-8 text-center">
          <div className="text-3xl">🔧</div>
          <p className="mt-3 p-serif text-lg">Coming Soon</p>
          <p className="mt-2 text-sm text-[color:var(--ink-soft)]">Wearable integrations are being finalized. Check back shortly.</p>
        </div>
      </div>
    </div>
  );
}
