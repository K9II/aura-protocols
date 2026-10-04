import { handleSesEvent, verifySnsMessage, type SnsMessage } from "@/lib/ses-events";
import { alertOwner } from "@/lib/notify";

const SNS_HOST = /^sns\.[a-z0-9-]+\.amazonaws\.com$/;

// SES → SNS → here. Only signed messages from our own topic are acted on.
// Handling errors return 500 so SNS retries.
export async function POST(request: Request): Promise<Response> {
  let m: SnsMessage;
  try { m = JSON.parse(await request.text()) as SnsMessage; } catch { return new Response("bad request", { status: 400 }); }
  const topic = process.env.SES_EVENTS_TOPIC_ARN;
  if (!topic || m.TopicArn !== topic || !(await verifySnsMessage(m))) return new Response("forbidden", { status: 403 });

  if (m.Type === "SubscriptionConfirmation") {
    const url = new URL(m.SubscribeURL ?? "");
    if (url.protocol !== "https:" || !SNS_HOST.test(url.hostname)) return new Response("forbidden", { status: 403 });
    const res = await fetch(url.toString());
    return new Response(res.ok ? "confirmed" : "confirm failed", { status: res.ok ? 200 : 502 });
  }
  if (m.Type !== "Notification") return new Response("ignored", { status: 200 });
  try {
    await handleSesEvent(JSON.parse(m.Message ?? "{}"));
    return new Response("ok", { status: 200 });
  } catch (err) {
    await alertOwner("SES bounce/complaint not recorded", `${m.MessageId}: ${String(err)}`);
    return new Response("error", { status: 500 });
  }
}
