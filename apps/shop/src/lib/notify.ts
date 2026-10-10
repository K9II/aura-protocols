import "server-only";
import { sendEmail } from "@/lib/ses";
import { opsAlertEmail } from "@/lib/emails";
import { recordOwnerAlert } from "@/lib/today/alerts";

export function alertAddress(): string | undefined {
  return process.env.ORDER_ALERT_EMAIL || process.env.INQUIRY_NOTIFY_EMAIL;
}

// Owner alert. Never throws — a broken alert must not break the flow that
// raised it. Logged, then stored for Today (one open alert per title; the
// same problem again counts up), then emailed. A failed store still emails; a
// failed email still leaves the alert on Today. Keep the title stable — order
// numbers, ids, counts and names go in the detail, or one problem splits into
// many alerts.
export async function alertOwner(title: string, detail: string): Promise<void> {
  console.error(`[owner alert] ${title}: ${detail}`);
  try { await recordOwnerAlert(title, detail); }
  catch (err) { console.error("owner alert not stored:", err); }
  const to = alertAddress();
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
    await alertOwner("Email failed to send to a customer", `Subject: ${msg.subject}\n${context}\nTo: ${msg.to}\n${String(err)}`);
    return false;
  }
}
