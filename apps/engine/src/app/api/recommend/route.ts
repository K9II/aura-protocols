import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { recommend } from "@/lib/recommend";
import type { BiometricSnapshot } from "@/lib/terra/schema";
import { ProfileContextSchema } from "@/lib/profile/schema";

export const runtime = "nodejs";

export async function POST(_request: Request) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: rows } = await supabase
    .from("biometric_snapshots")
    .select("source, captured_at, recovery_score, hrv_ms, resting_hr_bpm, sleep_hours, deep_sleep_hours, rem_sleep_hours, steps, active_calories, glucose_avg_mgdl, glucose_variability, weight_kg")
    .eq("user_id", user.id)
    .order("captured_at", { ascending: false })
    .limit(14);

  const series: BiometricSnapshot[] = (rows ?? []).map((r) => ({
    source: r.source, capturedAt: r.captured_at, recoveryScore: r.recovery_score,
    hrvMs: r.hrv_ms, restingHrBpm: r.resting_hr_bpm, sleepHours: r.sleep_hours,
    deepSleepHours: r.deep_sleep_hours, remSleepHours: r.rem_sleep_hours,
    steps: r.steps, activeCalories: r.active_calories,
    glucoseAvgMgdl: r.glucose_avg_mgdl, glucoseVariability: r.glucose_variability,
    weightKg: r.weight_kg,
  }));

  if (series.length === 0) {
    return NextResponse.json({ error: "no_data", message: "Connect a wearable or upload manual data first." }, { status: 400 });
  }

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("age, biological_sex, weight_kg, activity_level, primary_goal, current_medications, using_peptides, peptides_detail, interested_in_rx, budget_tier, onboarding_complete, glp1_status, glp1_stopped_month, menopause_status")
    .eq("id", user.id)
    .maybeSingle();

  const profileParsed = ProfileContextSchema.safeParse(profileRow ?? {});
  const profile = profileParsed.success ? profileParsed.data : null;

  const { rules, output } = await recommend(series, profile);

  const { data: saved } = await supabase
    .from("protocol_recommendations")
    .insert({ user_id: user.id, template: rules.template, rules_summary: rules, llm_summary: { model: "claude-opus-4-7" }, output })
    .select()
    .single();

  return NextResponse.json({ id: saved?.id, rules, output });
}
