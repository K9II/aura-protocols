import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyTerraSignature } from "@/lib/terra/client";
import { mapTerraType, normalizeTerraPayload } from "@/lib/terra/normalize";
import { coalesceRow, toRow } from "@/lib/terra/merge";
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

  const model = mapTerraType(payload.type);
  let merged = 0;

  for (const d of payload.data ?? []) {
    const snap = normalizeTerraPayload(model, d as Record<string, unknown>, conn.provider);
    const row = toRow(conn.user_id, snap);

    const { data: existing } = await admin
      .from("biometric_snapshots")
      .select("*")
      .eq("user_id", conn.user_id)
      .eq("metric_date", row.metric_date)
      .maybeSingle();

    const next = coalesceRow((existing as never) ?? null, row);
    await admin
      .from("biometric_snapshots")
      .upsert(next, { onConflict: "user_id,metric_date" });
    merged += 1;
  }

  return NextResponse.json({ ok: true, model, merged });
}
