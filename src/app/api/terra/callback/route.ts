import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const PROVIDERS = new Set(["WHOOP","OURA","APPLE","GARMIN","FITBIT","DEXCOM"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const userId = url.searchParams.get("reference_id");
  const terraUserId = url.searchParams.get("user_id");
  const providerRaw = (url.searchParams.get("resource") ?? "").toUpperCase();
  const provider = PROVIDERS.has(providerRaw) ? providerRaw : null;

  if (status === "success" && userId && terraUserId && provider) {
    const admin = getSupabaseAdminClient();
    await admin.from("wearable_connections").insert({ user_id: userId, provider, terra_user_id: terraUserId });
    return NextResponse.redirect(new URL("/recommendation", url.origin));
  }
  return NextResponse.redirect(new URL("/connect?error=1", url.origin));
}
