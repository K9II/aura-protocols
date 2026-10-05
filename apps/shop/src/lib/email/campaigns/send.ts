import "server-only";
// The one campaign sender, used by Send now and by the hourly run. Works
// through the frozen recipient list until the deadline; each address is tried
// at most once per call (cursor by email). A failed send stays pending and is
// retried on the next run, up to MAX_SEND_ATTEMPTS, then counted as failed.
// The campaign is marked sent when nobody is left pending.
//
// Before touching any recipient, the campaign is rendered once to a
// placeholder address and run through the compliance scan: a config error
// (missing MAILING_ADDRESS / EMAIL_LINK_SECRET) or a banned phrase throws
// here — before the list is touched — instead of being swallowed as a
// per-recipient failure on everyone.
//
// A run of CAMPAIGN_FAIL_STREAK consecutive per-recipient failures trips a
// circuit breaker: the batch stops immediately and alerts the owner. A
// system-wide outage must not burn the whole list down to "failed" (and the
// campaign must not finish while that's happening).
import { getCampaign, pendingRecipients, setRecipient, recipientCounts, moveCampaign, codeForCampaign, type CampaignRow } from "@/lib/email/campaigns/data";
import { campaignEmail, type RenderCode } from "@/lib/email/campaigns/render";
import { sendTracked, subscriberStatuses } from "@/lib/email/data";
import { unsubscribeUrl } from "@/lib/email/links";
import { assertCompliant } from "@/lib/email/compliance";
import { CAMPAIGN_BATCH, CAMPAIGN_FAIL_STREAK, CAMPAIGN_STOP_CHECK_EVERY, MAX_SEND_ATTEMPTS } from "@/lib/email/constants";
import { alertOwner } from "@/lib/notify";
import { siteUrl } from "@/lib/supabase/env";

export type BatchResult = { sent: number; skipped: number; failed: number; remaining: number; finished: boolean; stopped: boolean };

const PREFLIGHT_EMAIL = "preflight@auraprotocols.com";

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

// Renders once to a placeholder address and scans it, so a config error or a
// compliance miss throws before any real recipient is attempted.
async function preflight(c: CampaignRow, code: RenderCode | null): Promise<void> {
  const { msg } = await renderFor(c, PREFLIGHT_EMAIL, code);
  assertCompliant(msg.subject, msg.html);
}

export async function sendCampaignBatch(id: string, deadlineMs: number): Promise<BatchResult> {
  const out: BatchResult = { sent: 0, skipped: 0, failed: 0, remaining: 0, finished: false, stopped: false };
  let c = await getCampaign(id);
  if (!c || c.status !== "sending") return { ...out, stopped: c?.status === "stopped" };
  const code = await campaignCode(c);
  await preflight(c, code);

  const failures: string[] = [];
  let cursor = "", outOfTime = false, tripped = false, streak = 0, lastError = "", sinceCheck = 0;

  while (!outOfTime && !tripped) {
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
      if (sinceCheck >= CAMPAIGN_STOP_CHECK_EVERY) {
        sinceCheck = 0;
        c = await getCampaign(id); // Stop takes effect promptly, not only between CAMPAIGN_BATCH batches
        if (!c || c.status !== "sending") { out.stopped = true; break; }
      }
      cursor = r.email;
      sinceCheck++;
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
        streak = 0;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const attempts = r.attempts + 1;
        await setRecipient(id, r.email, { state: attempts >= MAX_SEND_ATTEMPTS ? "failed" : "pending", attempts, last_error: message.slice(0, 500) });
        out.failed++;
        failures.push(`${r.email} (try ${attempts} of ${MAX_SEND_ATTEMPTS}): ${message}`);
        lastError = message;
        streak++;
        // Smells like an outage (SES down, a bad template) rather than a run
        // of bad addresses — stop before the whole list is burned through
        // attempts and the campaign wrongly finishes as "sent".
        if (streak >= CAMPAIGN_FAIL_STREAK) { tripped = true; break; }
      }
    }
    if (out.stopped) break;
  }

  if (tripped) {
    await alertOwner(
      `Campaign "${c?.name ?? id}": stopped after ${CAMPAIGN_FAIL_STREAK} failures in a row`,
      `${lastError}\n\n${failures.join("\n")}`,
    );
    out.remaining = (await recipientCounts(id)).pending; // still pending: the next run retries them
    return out;
  }

  if (failures.length) await alertOwner(`Campaign "${c?.name ?? id}": ${failures.length} not sent`, failures.join("\n"));
  if (out.stopped) return out;

  const counts = await recipientCounts(id);
  out.remaining = counts.pending;
  if (counts.pending === 0) {
    if (counts.sent === 0 && counts.failed > 0) {
      // Nothing delivered and nothing left pending: leaving it "sending"
      // would keep it stuck there forever (pendingRecipients comes back
      // empty every hour) — busy, blocking every other campaign, and
      // re-alerting on every run. Stop it instead; the owner already got
      // the alert above when this run happened to fail the last batch.
      await alertOwner(
        `Campaign "${c?.name ?? id}": stopped — nothing was delivered (${counts.failed} failed)`,
        failures.join("\n") || "Nothing was delivered.",
      );
      await moveCampaign(id, "sending", "stopped", null);
      out.stopped = true;
    } else {
      if (counts.failed > 0) {
        await alertOwner(`Campaign "${c?.name ?? id}" finished with ${counts.failed} failed`, `${counts.sent} sent, ${counts.failed} failed, ${counts.skipped} skipped.`);
      }
      await moveCampaign(id, "sending", "sent", null);
      out.finished = true;
    }
  }
  return out;
}
