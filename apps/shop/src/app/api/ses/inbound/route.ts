import { verifySnsMessage, type SnsMessage } from "@/lib/ses-events";
import { handleInbound } from "@/lib/inquiries/inbound";
import { alertOwner } from "@/lib/notify";

const SNS_HOST = /^sns\.[a-z0-9-]+\.amazonaws\.com$/;

// SES receiving (in.auraprotocols.com) → S3 → SNS → here. Only signed
// messages from our own inbound topic are acted on. A failure returns 500 so
// SNS retries (handleInbound is idempotent) and alerts the owner.
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try { body = JSON.parse(await request.text()); } catch { return new Response("bad request", { status: 400 }); }
  if (typeof body !== "object" || body === null || Array.isArray(body)) return new Response("bad request", { status: 400 });
  const m = body as SnsMessage;
  const topic = process.env.SES_INBOUND_TOPIC_ARN;
  if (!topic) console.error("SES_INBOUND_TOPIC_ARN is not set; refusing inbound mail");
  if (!topic || m.TopicArn !== topic || !(await verifySnsMessage(m))) return new Response("forbidden", { status: 403 });

  if (m.Type === "SubscriptionConfirmation") {
    let url: URL;
    try { url = new URL(m.SubscribeURL ?? ""); } catch { return new Response("forbidden", { status: 403 }); }
    if (url.protocol !== "https:" || !SNS_HOST.test(url.hostname)) return new Response("forbidden", { status: 403 });
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
    return new Response(res.ok ? "confirmed" : "confirm failed", { status: res.ok ? 200 : 502 });
  }
  if (m.Type !== "Notification") return new Response("ignored", { status: 200 });
  try {
    const result = await handleInbound(JSON.parse(m.Message ?? "{}"));
    return new Response(result, { status: 200 });
  } catch (err) {
    await alertOwner("Inquiry email not recorded", `${m.MessageId ?? "?"}: ${String(err)}`);
    return new Response("error", { status: 500 });
  }
}

// Large emails (photos) take a moment to fetch and store.
export const maxDuration = 60;
