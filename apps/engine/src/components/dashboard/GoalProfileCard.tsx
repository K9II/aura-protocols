// Matches the GOAL_LABELS used in onboarding/IntakeForm (profile.primary_goal
// enum values), distinct from protocol PROTOCOL_LABELS.
const GOAL_LABELS: Record<string, string> = {
  recovery: "Recovery & Injury Repair",
  body_comp: "Body Composition",
  sleep_stress: "Sleep & Stress",
  performance: "Athletic Performance",
  longevity: "Longevity",
};

interface Props {
  primaryGoal: string | null;
  completenessScore: number;
}

export default function GoalProfileCard({ primaryGoal, completenessScore }: Props) {
  const goalLabel = primaryGoal ? (GOAL_LABELS[primaryGoal] ?? primaryGoal) : "Not set";
  return (
    <section className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-violet-300">Goal &amp; profile</p>
      <h2 className="mt-1 font-display text-xl font-bold text-white">{goalLabel}</h2>
      <p className="mt-2 text-sm text-slate-300">Profile {completenessScore}% complete</p>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-violet-400" style={{ width: `${completenessScore}%` }} />
      </div>
      <a href="/onboarding" className="mt-4 inline-flex rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">
        Edit profile &amp; goal
      </a>
    </section>
  );
}
