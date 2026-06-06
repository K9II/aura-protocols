import type { ProfileContext } from "@/lib/profile/schema";

const SCORED_FIELDS: Array<{
  key: keyof ProfileContext;
  weight: number;
  prompt: string;
  applies?: (p: ProfileContext) => boolean; // default: always applies
}> = [
  { key: "age", weight: 15, prompt: "Add your age to refine dosing guidance" },
  { key: "biological_sex", weight: 10, prompt: "Add biological sex for hormone-relevant adjustments" },
  { key: "weight_kg", weight: 15, prompt: "Add your weight to unlock weight-based dosing" },
  { key: "activity_level", weight: 10, prompt: "Add your activity level for load-appropriate protocols" },
  { key: "primary_goal", weight: 20, prompt: "Set your primary goal for template selection" },
  { key: "current_medications", weight: 10, prompt: "List current medications for safety screening" },
  { key: "budget_tier", weight: 10, prompt: "Add your budget to filter protocol options" },
  { key: "interested_in_rx", weight: 10, prompt: "Set your prescription preference for routing" },
  { key: "glp1_status", weight: 10, prompt: "Add your GLP-1 history to tailor metabolic protocols" },
  {
    key: "menopause_status",
    weight: 10,
    prompt: "Add menopause status for hormone-aware protocols",
    applies: (p) => p.biological_sex === "female",
  },
];

export interface CompletenessResult {
  score: number;
  nextPrompt: string | null;
}

export function computeCompletenessScore(profile: ProfileContext | null): CompletenessResult {
  if (!profile) return { score: 0, nextPrompt: SCORED_FIELDS[0].prompt };

  let earned = 0;
  let applicableTotal = 0;
  let nextPrompt: string | null = null;

  for (const field of SCORED_FIELDS) {
    if (field.applies && !field.applies(profile)) continue;
    applicableTotal += field.weight;
    const val = profile[field.key];
    const filled = val !== null && val !== undefined && val !== "";
    if (filled) {
      earned += field.weight;
    } else if (!nextPrompt) {
      nextPrompt = field.prompt;
    }
  }

  const score = applicableTotal === 0 ? 0 : Math.round((earned / applicableTotal) * 100);
  return { score, nextPrompt };
}
