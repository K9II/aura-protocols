import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function GET(request: Request): Promise<Response> {
  const email = new URL(request.url).searchParams.get("email");
  if (!email) {
    return Response.json({ error: "Missing email param" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("lead_magnet_contacts")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("email", email);

  if (error) {
    return Response.json({ error: "Could not unsubscribe" }, { status: 500 });
  }

  return Response.json({ ok: true }, { status: 200 });
}
