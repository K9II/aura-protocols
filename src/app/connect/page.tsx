import { redirect } from "next/navigation";
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
        <div className="mt-6"><SignInForm /></div>
      </main>
    );
  }

  const { count } = await supabase
    .from("biometric_snapshots")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((count ?? 0) > 0) redirect("/recommendation");

  return (
    <main className="mx-auto max-w-md px-6 py-20">
      <h1 className="text-3xl font-bold text-white">Connect your wearable</h1>
      <p className="mt-3 text-slate-300">Whoop, Oura, Apple Health, Garmin, Fitbit, Dexcom CGM. We use Terra to abstract the OAuth flow.</p>
      <div className="mt-6"><ConnectButton /></div>
      <p className="mt-6 text-sm text-slate-400">
        Don&apos;t have a supported wearable? <a href="/upload" className="text-cyan-300 underline">Paste manual data</a>.
      </p>
    </main>
  );
}
