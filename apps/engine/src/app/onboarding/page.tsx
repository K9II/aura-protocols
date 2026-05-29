import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import IntakeForm from "./IntakeForm";

export const runtime = "nodejs";

export default async function OnboardingPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connect?next=/onboarding");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_complete")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.onboarding_complete) redirect("/connect");

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-cyan-400">Biosignature Setup</p>
      <h1 className="mb-2 font-display text-3xl font-bold text-white">Tell us about yourself</h1>
      <p className="mb-8 text-slate-400 text-sm">Takes 2 minutes. Used only to personalize your protocol — never shared.</p>
      <IntakeForm />
    </main>
  );
}
