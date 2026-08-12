import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { BiometricSnapshotSchema } from "@/lib/terra/schema";
import { biometricSnapshotToRow } from "@/lib/terra/snapshot-row";

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

  const { error } = await supabase
    .from("biometric_snapshots")
    .insert(biometricSnapshotToRow(user.id, snap));

  if (error) return NextResponse.json({ error: "db_insert_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
