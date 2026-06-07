import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import RecommendationClient from "./RecommendationClient";
import type { ProtocolOutput, Tension } from "@/lib/recommend/schema";
import { ProfileContextSchema } from "@/lib/profile/schema";
import { computeCompletenessScore } from "@/lib/profile/completeness";
import { resolveRouting } from "@/lib/recommend/routing";
import type { RoutingDecision } from "@/lib/recommend/routing";
import type { RulesSummary } from "@/lib/recommend/schema";

export const runtime = "nodejs";

export default async function RecommendationPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connect?next=/recommendation");

  const [{ data: latest }, { data: profileRow }] = await Promise.all([
    supabase
      .from("protocol_recommendations")
      .select("id, output, created_at, rules_summary, tensions")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("age, biological_sex, weight_kg, activity_level, primary_goal, current_medications, using_peptides, peptides_detail, interested_in_rx, budget_tier, onboarding_complete, glp1_status, glp1_stopped_month, menopause_status")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const profileParsed = ProfileContextSchema.safeParse(profileRow ?? {});
  const profile = profileParsed.success ? profileParsed.data : null;

  const { score: completenessScore, nextPrompt } = computeCompletenessScore(profile);

  let protocolAgeDays: number | null = null;
  if (latest?.created_at) {
    const diffMs = Date.now() - new Date(latest.created_at as string).getTime();
    protocolAgeDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  let routingDecision: RoutingDecision | null = null;
  if (latest?.rules_summary) {
    routingDecision = resolveRouting({ profile, rules: latest.rules_summary as unknown as RulesSummary });
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <a href="/dashboard" className="mb-6 inline-flex text-sm text-cyan-300 hover:underline">← Dashboard</a>
      <RecommendationClient
        initial={latest ? { id: latest.id as string, output: latest.output as unknown as ProtocolOutput, rules: (latest.rules_summary as unknown as RulesSummary) ?? { template: "RECOVERY", triggers: [], contraindications: [], doseCeilings: {} }, tensions: (latest.tensions as unknown as Tension[]) ?? [] } : null}
        profile={profile}
        completenessScore={completenessScore}
        nextPrompt={nextPrompt}
        protocolAgeDays={protocolAgeDays}
        routingDecision={routingDecision}
      />
    </main>
  );
}
