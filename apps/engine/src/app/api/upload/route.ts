import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { BiometricSnapshotSchema } from "@/lib/terra/schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = BiometricSnapshotSchema.safeParse({ source: "MANUAL", ...(body as object) });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload", issues: parsed.error.issues }, { status: 400 });
  }
  const snap = parsed.data;

  const { error } = await supabase.from("biometric_snapshots").insert({
    user_id: user.id, source: snap.source, captured_at: snap.capturedAt,
    recovery_score: snap.recoveryScore ?? null, hrv_ms: snap.hrvMs ?? null,
    resting_hr_bpm: snap.restingHrBpm ?? null, sleep_hours: snap.sleepHours ?? null,
    deep_sleep_hours: snap.deepSleepHours ?? null, rem_sleep_hours: snap.remSleepHours ?? null,
    steps: snap.steps ?? null, active_calories: snap.activeCalories ?? null,
    glucose_avg_mgdl: snap.glucoseAvgMgdl ?? null, glucose_variability: snap.glucoseVariability ?? null,
    raw: snap.raw ?? null,
  });

  if (error) return NextResponse.json({ error: "db_insert_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
