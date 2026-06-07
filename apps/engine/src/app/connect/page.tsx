import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import ConnectButton from "@/components/ConnectButton";
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

  // No trap: an onboarded user always sees the connect/upload UI so they can
  // add a second device or refresh stale data. (Removed the old
  // biometric_snapshots count > 0 → redirect("/recommendation").)
  return (
    <main className="mx-auto max-w-md px-6 py-20">
      <a href="/dashboard" className="text-sm text-cyan-300 hover:underline">← Back to dashboard</a>
      <h1 className="mt-4 text-3xl font-bold text-white">Connect your wearable</h1>
      <p className="mt-3 text-slate-300">Whoop, Oura, Garmin, Fitbit, Dexcom CGM. We use Terra to abstract the OAuth flow.</p>
      <p className="mt-2 text-sm text-slate-400">Apple Health, Samsung Health, and Google Fit are coming with our mobile app.</p>
      <div className="mt-6"><ConnectButton /></div>
      <p className="mt-6 text-sm text-slate-400">
        Don&apos;t have a supported wearable? <a href="/upload" className="text-cyan-300 underline">Paste manual data</a>.
      </p>
    </main>
  );
}
