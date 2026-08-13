export const runtime = "nodejs";

import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { profileToIntakeState } from "@/lib/profile/intake-state";
import IntakeForm from "./IntakeForm";

export default async function OnboardingPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connect?next=/onboarding");

  const [{ data: profile }, { data: snapshots }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("biometric_snapshots").select("id").eq("user_id", user.id).limit(1),
  ]);

  const hasData = (snapshots?.length ?? 0) > 0;
  const initial = profileToIntakeState(profile ?? null);

  return (
    <div className="pharmacopoeia">
      <div className="p-container max-w-lg py-16">
        <p className="p-cat-label mb-2">Biosignature Setup</p>
        <h1 className="mb-6 p-serif text-3xl">Tell us about yourself</h1>
        <IntakeForm initial={initial} hasData={hasData} />
      </div>
    </div>
  );
}
