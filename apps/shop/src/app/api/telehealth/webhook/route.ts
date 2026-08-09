import { verifyWebhookSignature } from "@/lib/telehealth/signature";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.LEGUPRX_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: "not configured" }, { status: 503 });

  const rawBody = await request.text();
  const check = verifyWebhookSignature({ header: request.headers.get("X-LegUpRx-Signature"), rawBody, secret });
  if (!check.valid) return Response.json({ error: "invalid signature" }, { status: 401 });

  let payload: unknown;
  try { payload = JSON.parse(rawBody); } catch { return Response.json({ error: "bad json" }, { status: 400 }); }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("telehealth_events").upsert(
    {
      delivery_id: request.headers.get("X-LegUpRx-Delivery"),
      event: request.headers.get("X-LegUpRx-Event") ?? "",
      payload,
      received_at: new Date().toISOString(),
    },
    { onConflict: "delivery_id" },
  );
  if (error) { console.error("telehealth webhook store failed:", error); return Response.json({ error: "store failed" }, { status: 500 }); }
  return Response.json({ ok: true }, { status: 200 });
}
