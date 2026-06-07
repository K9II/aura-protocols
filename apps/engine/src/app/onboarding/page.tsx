import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ProfileContextSchema } from "@/lib/profile/schema";
import { profileToIntakeState } from "@/lib/profile/intake-state";
import IntakeForm from "./IntakeForm";

export const runtime = "nodejs";

export default async function OnboardingPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connect?next=/onboarding");

  // Re-enterable: no onboarding_complete → /connect bounce. Load the saved
  // profile so editing/changing-goal prefills the wizard.
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("age, biological_sex, weight_kg, activity_level, primary_goal, current_medications, using_peptides, peptides_detail, interested_in_rx, budget_tier, onboarding_complete, glp1_status, glp1_stopped_month, menopause_status")
    .eq("id", user.id)
    .maybeSingle();

  const parsed = ProfileContextSchema.safeParse(profileRow ?? {});
  const initial = profileToIntakeState(parsed.success ? parsed.data : null);

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-cyan-400">Biosignature Setup</p>
      <h1 className="mb-2 font-display text-3xl font-bold text-white">Tell us about yourself</h1>
      <p className="mb-8 text-slate-400 text-sm">Takes 2 minutes. Used only to personalize your protocol — never shared.</p>
      <IntakeForm initial={initial} />
    </main>
  );
}
