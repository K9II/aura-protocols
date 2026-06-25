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
      <main className="mx-auto max-w-md px-6 py-20">
        <h1 className="text-3xl font-bold text-white">Sign in to continue</h1>
        <p className="mt-3 text-slate-300">We email you a one-time link. No password. We store your fitness data, not PHI.</p>
        <div className="mt-6">
          <Suspense fallback={null}>
            <SignInForm />
          </Suspense>
        </div>
      </main>
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
    <main className="mx-auto max-w-md px-6 py-20">
      <a href="/dashboard" className="text-sm text-cyan-300 hover:underline">← Back to dashboard</a>
      <h1 className="mt-4 text-3xl font-bold text-white">Connect your wearable</h1>
      <div className="mt-6 rounded-2xl border border-violet-500/30 bg-violet-500/10 px-6 py-8 text-center">
        <div className="text-3xl">🔧</div>
        <p className="mt-3 text-lg font-semibold text-white">Under Construction</p>
        <p className="mt-2 text-sm text-slate-300">Wearable integrations are being finalized. Manual data upload is available in the meantime.</p>
      </div>
      <p className="mt-6 text-sm text-slate-400">
        <a href="/upload" className="text-cyan-300 underline">Upload data manually</a> to generate your protocol now.
      </p>
    </main>
  );
}
