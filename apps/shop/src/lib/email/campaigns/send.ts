import "server-only";
// The one campaign sender, used by Send now and by the hourly run. Works
// through the frozen recipient list until the deadline; each address is tried
// at most once per call (cursor by email). A failed send stays pending and is
// retried on the next run, up to MAX_SEND_ATTEMPTS, then counted as failed.
// The campaign is marked sent when nobody is left pending.
import { getCampaign, pendingRecipients, setRecipient, recipientCounts, moveCampaign, codeForCampaign, type CampaignRow } from "@/lib/email/campaigns/data";
import { campaignEmail, type RenderCode } from "@/lib/email/campaigns/render";
import { sendTracked, subscriberStatuses } from "@/lib/email/data";
import { unsubscribeUrl } from "@/lib/email/links";
import { CAMPAIGN_BATCH, MAX_SEND_ATTEMPTS } from "@/lib/email/constants";
import { alertOwner } from "@/lib/notify";
import { siteUrl } from "@/lib/supabase/env";

export type BatchResult = { sent: number; skipped: number; failed: number; remaining: number; finished: boolean; stopped: boolean };

function mailingAddress(): string {
  const a = process.env.MAILING_ADDRESS;
  if (!a) throw new Error("Missing MAILING_ADDRESS environment variable (required in every marketing email)");
  return a;
}

export async function renderFor(c: CampaignRow, email: string, code: RenderCode | null, opts: { test?: boolean } = {}) {
  const site = siteUrl();
  const unsub = unsubscribeUrl(site, email, `campaign.${c.id}`);
  const msg = campaignEmail(
    { kind: c.kind, subject: c.subject, previewText: c.preview_text, content: c.content, lots: c.lots_snapshot, code },
    { site, unsubscribeUrl: unsub, mailingAddress: mailingAddress() }, opts,
  );
  return { msg, unsub };
}

export async function campaignCode(c: CampaignRow): Promise<RenderCode | null> {
  if (c.kind !== "promotion") return null;
  const code = await codeForCampaign(c.discount_code_id);
  if (!code) throw new Error(`Campaign "${c.name}": its discount code is missing — not sent.`);
  return code.render;
}

export async function sendCampaignBatch(id: string, deadlineMs: number): Promise<BatchResult> {
  const out: BatchResult = { sent: 0, skipped: 0, failed: 0, remaining: 0, finished: false, stopped: false };
  let c = await getCampaign(id);
  if (!c || c.status !== "sending") return { ...out, stopped: c?.status === "stopped" };
  const code = await campaignCode(c);
  const failures: string[] = [];
  let cursor = "", outOfTime = false;

  while (!outOfTime) {
    if (Date.now() > deadlineMs) { outOfTime = true; break; }
    const batch = await pendingRecipients(id, cursor, CAMPAIGN_BATCH);
    if (!batch.length) break;
    if (cursor) {
      c = await getCampaign(id); // the owner may have pressed Stop
      if (!c || c.status !== "sending") { out.stopped = true; break; }
    }
    const statuses = await subscriberStatuses(batch.map((r) => r.email));
    for (const r of batch) {
      if (Date.now() > deadlineMs) { outOfTime = true; break; }
      cursor = r.email;
      if (statuses.get(r.email) !== "confirmed") {
        await setRecipient(id, r.email, { state: "skipped" });
        out.skipped++;
        continue;
      }
      try {
        const { msg, unsub } = await renderFor(c!, r.email, code);
        await sendTracked({ email: r.email, kind: "campaign", ref: id, msg, unsubscribeUrl: unsub });
        await setRecipient(id, r.email, { state: "sent" });
        out.sent++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const attempts = r.attempts + 1;
        await setRecipient(id, r.email, { state: attempts >= MAX_SEND_ATTEMPTS ? "failed" : "pending", attempts, last_error: message.slice(0, 500) });
        out.failed++;
        failures.push(`${r.email} (try ${attempts} of ${MAX_SEND_ATTEMPTS}): ${message}`);
      }
    }
  }

  if (failures.length) await alertOwner(`Campaign "${c?.name ?? id}": ${failures.length} not sent`, failures.join("\n"));
  if (out.stopped) return out;
  const counts = await recipientCounts(id);
  out.remaining = counts.pending;
  if (counts.pending === 0) {
    await moveCampaign(id, "sending", "sent", null);
    out.finished = true;
  }
  return out;
}
