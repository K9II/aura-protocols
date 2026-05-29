import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createTerraWidgetSession } from "@/lib/terra/client";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { providers?: string[] };
  const providers = body.providers?.length ? body.providers : ["WHOOP","OURA","APPLE","GARMIN","FITBIT","DEXCOM"];

  const origin = new URL(request.url).origin;
  try {
    const session = await createTerraWidgetSession({
      referenceId: user.id,
      providers,
      successUrl: `${origin}/api/terra/callback?status=success`,
      failureUrl: `${origin}/api/terra/callback?status=failure`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "unknown" }, { status: 502 });
  }
}
