import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyTerraSignature } from "@/lib/terra/client";
import { normalizeTerraDaily } from "@/lib/terra/normalize";
import { TerraWebhookPayloadSchema } from "@/lib/terra/schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifyTerraSignature(raw, request.headers.get("terra-signature"))) {
    return NextResponse.json({ error: "bad_signature" }, { status: 401 });
  }

  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const result = TerraWebhookPayloadSchema.safeParse(parsed);
  if (!result.success) return NextResponse.json({ error: "schema_mismatch" }, { status: 400 });

  const payload = result.data;
  const admin = getSupabaseAdminClient();
  const { data: conn } = await admin
    .from("wearable_connections")
    .select("user_id, provider")
    .eq("terra_user_id", payload.user.user_id)
    .is("revoked_at", null)
    .single();

  if (!conn) return NextResponse.json({ error: "no_connection" }, { status: 404 });

  const rows = (payload.data ?? []).map((d) => {
    const snap = normalizeTerraDaily({ ...(d as object), provider: conn.provider });
    return {
      user_id: conn.user_id, source: snap.source, captured_at: snap.capturedAt,
      recovery_score: snap.recoveryScore, hrv_ms: snap.hrvMs, resting_hr_bpm: snap.restingHrBpm,
      sleep_hours: snap.sleepHours, deep_sleep_hours: snap.deepSleepHours, rem_sleep_hours: snap.remSleepHours,
      steps: snap.steps, active_calories: snap.activeCalories,
      glucose_avg_mgdl: snap.glucoseAvgMgdl, glucose_variability: snap.glucoseVariability, raw: snap.raw,
    };
  });

  if (rows.length > 0) await admin.from("biometric_snapshots").insert(rows);
  return NextResponse.json({ ok: true, inserted: rows.length });
}
