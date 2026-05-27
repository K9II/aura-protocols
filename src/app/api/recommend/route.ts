import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { recommend } from "@/lib/recommend";
import type { BiometricSnapshot } from "@/lib/terra/schema";

export const runtime = "nodejs";

export async function POST(_request: Request) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: rows } = await supabase
    .from("biometric_snapshots")
    .select("source, captured_at, recovery_score, hrv_ms, resting_hr_bpm, sleep_hours, deep_sleep_hours, rem_sleep_hours, steps, active_calories, glucose_avg_mgdl, glucose_variability")
    .eq("user_id", user.id)
    .order("captured_at", { ascending: false })
    .limit(14);

  const series: BiometricSnapshot[] = (rows ?? []).map((r) => ({
    source: r.source, capturedAt: r.captured_at, recoveryScore: r.recovery_score,
    hrvMs: r.hrv_ms, restingHrBpm: r.resting_hr_bpm, sleepHours: r.sleep_hours,
    deepSleepHours: r.deep_sleep_hours, remSleepHours: r.rem_sleep_hours,
    steps: r.steps, activeCalories: r.active_calories,
    glucoseAvgMgdl: r.glucose_avg_mgdl, glucoseVariability: r.glucose_variability,
  }));

  if (series.length === 0) {
    return NextResponse.json({ error: "no_data", message: "Connect a wearable or upload manual data first." }, { status: 400 });
  }

  const { rules, output } = await recommend(series);

  const { data: saved } = await supabase
    .from("protocol_recommendations")
    .insert({ user_id: user.id, template: rules.template, rules_summary: rules, llm_summary: { model: "claude-opus-4-7" }, output })
    .select()
    .single();

  return NextResponse.json({ id: saved?.id, rules, output });
}
