import type { ProfileContext } from "@/lib/profile/schema";

// Per-step form state for the onboarding wizard. Pure + server-safe so the
// server page can build prefill values and pass them to the client form.

export type Step1 = {
  age: string;
  biological_sex: string;
  weight: string;
  weight_unit: "lbs" | "kg";
  activity_level: string;
};

export type Step2 = {
  primary_goal: string;
  current_medications: string;
  using_peptides: boolean;
  peptides_detail: string;
  glp1_status: string;
  glp1_stopped_month: string;
  menopause_status: string;
};

export type Step3 = { interested_in_rx: boolean; budget_tier: string };

export interface IntakeState {
  step1: Step1;
  step2: Step2;
  step3: Step3;
}

export function emptyIntakeState(): IntakeState {
  return {
    step1: { age: "", biological_sex: "", weight: "", weight_unit: "lbs", activity_level: "" },
    step2: {
      primary_goal: "", current_medications: "", using_peptides: false, peptides_detail: "",
      glp1_status: "", glp1_stopped_month: "", menopause_status: "",
    },
    step3: { interested_in_rx: false, budget_tier: "" },
  };
}

function str(v: string | null | undefined): string {
  return v ?? "";
}

export function profileToIntakeState(profile: ProfileContext | null): IntakeState {
  if (!profile) return emptyIntakeState();
  return {
    step1: {
      age: profile.age != null ? String(profile.age) : "",
      biological_sex: str(profile.biological_sex),
      // Stored canonically in kg — prefill in kg so no lossy round-trip.
      weight: profile.weight_kg != null ? String(profile.weight_kg) : "",
      weight_unit: "kg",
      activity_level: str(profile.activity_level),
    },
    step2: {
      primary_goal: str(profile.primary_goal),
      current_medications: str(profile.current_medications),
      using_peptides: Boolean(profile.using_peptides),
      peptides_detail: str(profile.peptides_detail),
      glp1_status: str(profile.glp1_status),
      glp1_stopped_month: str(profile.glp1_stopped_month),
      menopause_status: str(profile.menopause_status),
    },
    step3: {
      interested_in_rx: Boolean(profile.interested_in_rx),
      budget_tier: str(profile.budget_tier),
    },
  };
}
