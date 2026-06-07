import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { resolveDashboardRoute } from "@/lib/recommend/dashboard-route";
import { computeCompletenessScore } from "@/lib/profile/completeness";
import { ProfileContextSchema } from "@/lib/profile/schema";
import { PROTOCOL_LABELS } from "@/lib/constants";
import type { ProtocolOutput } from "@/lib/recommend/schema";
import ProtocolSummaryCard from "@/components/dashboard/ProtocolSummaryCard";
import ConnectionsCard, { type ConnectionItem } from "@/components/dashboard/ConnectionsCard";
import GoalProfileCard from "@/components/dashboard/GoalProfileCard";

export const runtime = "nodejs";

export default async function DashboardPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profileRow } = user
    ? await supabase
        .from("profiles")
        .select("age, biological_sex, weight_kg, activity_level, primary_goal, current_medications, using_peptides, peptides_detail, interested_in_rx, budget_tier, onboarding_complete, glp1_status, glp1_stopped_month, menopause_status")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const route = resolveDashboardRoute({
    hasUser: Boolean(user),
    onboardingComplete: Boolean(profileRow?.onboarding_complete),
  });
  if (route === "signin") redirect("/connect?next=/dashboard");
  if (route === "onboarding") redirect("/onboarding");

  // route === "hub" — load the rest of the user's state in parallel.
  const [connRes, recRes, snapRes] = await Promise.all([
    supabase
      .from("wearable_connections")
      .select("provider, connected_at, revoked_at")
      .eq("user_id", user!.id)
      .order("connected_at", { ascending: false }),
    supabase
      .from("protocol_recommendations")
      .select("output, created_at")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("biometric_snapshots")
      .select("captured_at", { count: "exact" })
      .eq("user_id", user!.id)
      .order("captured_at", { ascending: false })
      .limit(1),
  ]);

  const profileParsed = ProfileContextSchema.safeParse(profileRow ?? {});
  const profile = profileParsed.success ? profileParsed.data : null;
  const { score: completenessScore } = computeCompletenessScore(profile);

  const connections: ConnectionItem[] = (connRes.data ?? []).map((c) => ({
    provider: c.provider as string,
    connectedAt: c.connected_at as string,
    revoked: c.revoked_at != null,
  }));

  const output = (recRes.data?.output ?? null) as ProtocolOutput | null;
  const protocol = output
    ? {
        templateLabel: PROTOCOL_LABELS[output.template],
        topCompounds: output.steps.slice(0, 3).map((s) => s.compound),
      }
    : null;

  const newestSnapshotAt = (snapRes.data?.[0]?.captured_at as string | undefined) ?? null;
  const snapshotCount = snapRes.count ?? 0;
  const hasData = snapshotCount > 0;
  const recCreatedAt = (recRes.data?.created_at as string | undefined) ?? null;

  // Freshness (v1): newer data than the protocol → nudge to regenerate.
  let freshness: string;
  if (!recCreatedAt) {
    freshness = hasData ? "No protocol yet" : "No data yet";
  } else if (newestSnapshotAt && new Date(newestSnapshotAt).getTime() > new Date(recCreatedAt).getTime()) {
    freshness = "New data since your last protocol — regenerate to use it";
  } else {
    const ageDays = Math.floor((Date.now() - new Date(recCreatedAt).getTime()) / (1000 * 60 * 60 * 24));
    freshness = `Protocol is ${ageDays} day${ageDays === 1 ? "" : "s"} old`;
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">Your Engine</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-white">Dashboard</h1>
      <p className="mt-2 text-sm text-slate-400">{freshness}</p>

      <div className="mt-8 space-y-5">
        <ProtocolSummaryCard protocol={protocol} hasData={hasData} dataDays={snapshotCount} />
        <ConnectionsCard connections={connections} />
        <GoalProfileCard primaryGoal={profile?.primary_goal ?? null} completenessScore={completenessScore} />
      </div>
    </main>
  );
}
