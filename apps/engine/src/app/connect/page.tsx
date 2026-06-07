import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isTerraConfigured } from "@/lib/terra/client";
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
        <div className="mt-6"><SignInForm /></div>
      </main>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_complete")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.onboarding_complete) redirect("/onboarding");

  const { count } = await supabase
    .from("biometric_snapshots")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((count ?? 0) > 0) redirect("/recommendation");

  // Wearable OAuth depends on Terra credentials. Until they're provisioned, lead
  // with manual upload rather than a Connect button that can't start a session.
  if (!isTerraConfigured()) {
    return (
      <main className="mx-auto max-w-md px-6 py-20">
        <h1 className="text-3xl font-bold text-white">Add your data</h1>
        <p className="mt-3 text-slate-300">Paste your latest recovery, HRV, and sleep numbers and we&apos;ll build your protocol now.</p>
        <p className="mt-2 text-sm text-slate-400">One-tap wearable sync (Whoop, Oura, Garmin, Fitbit, Dexcom) is coming soon.</p>
        <div className="mt-6">
          <a href="/upload" className="inline-flex items-center justify-center rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-900 hover:bg-cyan-300">
            Enter data manually
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-6 py-20">
      <h1 className="text-3xl font-bold text-white">Connect your wearable</h1>
      <p className="mt-3 text-slate-300">Whoop, Oura, Garmin, Fitbit, Dexcom CGM. We use Terra to abstract the OAuth flow.</p>
      <p className="mt-2 text-sm text-slate-400">Apple Health, Samsung Health, and Google Fit are coming with our mobile app.</p>
      <div className="mt-6"><ConnectButton /></div>
      <p className="mt-6 text-sm text-slate-400">
        Don&apos;t have a supported wearable? <a href="/upload" className="text-cyan-300 underline">Paste manual data</a>.
      </p>
    </main>
  );
}
