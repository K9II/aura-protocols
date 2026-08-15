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

  return htmlPage(
    "You've been unsubscribed",
    "You won't receive any more protocol emails from Aura Protocols. Changed your mind? You can re-subscribe anytime at auraprotocols.com.",
    200
  );
}

function htmlPage(heading: string, body: string, status: number): Response {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${heading} — Aura Protocols</title>
<style>
  body { margin:0; background:#04060f; color:#e6edf3; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; display:flex; min-height:100vh; align-items:center; justify-content:center; padding:24px; }
  .card { max-width:460px; text-align:center; background:#0d1117; border:1px solid #161b22; border-radius:16px; padding:40px 32px; }
  h1 { font-size:22px; margin:0 0 12px; color:#fff; }
  p { font-size:15px; line-height:1.6; color:#9fb0c3; margin:0 0 24px; }
  a.btn { display:inline-block; background:#00d4ff; color:#04060f; font-weight:600; text-decoration:none; padding:10px 20px; border-radius:9999px; }
</style>
</head>
<body>
  <div class="card">
    <h1>${heading}</h1>
    <p>${body}</p>
    <a class="btn" href="https://auraprotocols.com">Back to Aura Protocols</a>
  </div>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
