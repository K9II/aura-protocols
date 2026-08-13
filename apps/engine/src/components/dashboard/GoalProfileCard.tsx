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
    <section className="p-card border border-[color:var(--line)] p-6">
      <p className="p-cat-label">Goal &amp; profile</p>
      <h2 className="mt-1 p-serif text-xl">{goalLabel}</h2>
      <p className="mt-2 text-sm text-[color:var(--ink-soft)]">Profile {completenessScore}% complete</p>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--line)]">
        <div className="h-full rounded-full bg-[color:var(--specimen)]" style={{ width: `${completenessScore}%` }} />
      </div>
      <a href="/onboarding" className="p-btn-outline mt-4 inline-flex px-4 py-2 text-sm font-semibold">
        Edit profile &amp; goal
      </a>
    </section>
  );
}
