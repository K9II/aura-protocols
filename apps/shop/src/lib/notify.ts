import "server-only";
import { sendEmail } from "@/lib/ses";
import { opsAlertEmail } from "@/lib/emails";

export function alertAddress(): string | undefined {
  return process.env.ORDER_ALERT_EMAIL || process.env.INQUIRY_NOTIFY_EMAIL;
}

// Owner alert. Never throws — a broken alert must not break the flow that raised it.
export async function alertOwner(title: string, detail: string): Promise<void> {
  const to = alertAddress();
  console.error(`[owner alert] ${title}: ${detail}`);
  if (!to) return;
  try { await sendEmail({ to, ...opsAlertEmail(title, detail) }); }
  catch (err) { console.error("owner alert email failed:", err); }
}

// Customer email that must not block the order. On failure, alerts the owner.
export async function sendOrAlert(msg: { to: string; subject: string; html: string }, context: string): Promise<boolean> {
  try {
    await sendEmail(msg);
    return true;
  } catch (err) {
    await alertOwner(`Email failed: ${msg.subject}`, `${context}\nTo: ${msg.to}\n${String(err)}`);
    return false;
  }
}
