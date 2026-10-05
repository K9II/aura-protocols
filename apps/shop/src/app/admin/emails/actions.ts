"use server";

// maxDuration is a route-segment option — Next.js only honors it when it's
// exported from a page.tsx/layout.tsx/route.ts, never from a plain "use
// server" actions file (see Server Actions in Next's maxDuration docs).
// There's no admin/emails UI yet (Part 1b, pending approved mocks); when
// that page.tsx is built it must export `maxDuration = 300` so a large send
// isn't cut off mid-run.

import { requireOwner } from "@/lib/dal";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { getLiveCatalog } from "@/lib/catalog-live";
import { unannouncedLots } from "@/lib/email/lots";
import { listConfirmedEmails, sendTracked } from "@/lib/email/data";
import { lotAlertEmail, type AlertLot } from "@/lib/emails-marketing";
import { unsubscribeUrl } from "@/lib/email/links";
import { siteUrl } from "@/lib/supabase/env";
import { alertOwner } from "@/lib/notify";

type Result = { ok: true; sent: number; failed?: number; remaining?: number } | { ok: false; error: string };

// Stop sending with headroom before a platform timeout; the remainder is
// left for the next Send/Resume click.
const TIME_BUDGET_MS = 240_000;

type AnnouncementRow = { lots: string[]; finished_at: string | null };

async function loadAnnouncementRows(): Promise<AnnouncementRow[]> {
  const { data, error } = await getSupabaseAdminClient().from("lot_announcements").select("lots, finished_at");
  if (error) throw new Error(`lot_announcements read failed: ${JSON.stringify(error)}`);
  return (data ?? []) as AnnouncementRow[];
}

// Lots ready to pick: tested + certified + not already (fully) announced.
// A lot that's part of the one announcement still in flight (finished_at
// null) is held out too — it's mid-send, not available to pick again — and
// reported separately so the caller can point the owner at Resume instead
// of "unknown lot".
async function pickLots(lots: string[]): Promise<{ picked: AlertLot[]; missing: string[]; stuckInOpen: string[] }> {
  const rows = await loadAnnouncementRows();
  const finishedLots = new Set(rows.filter((r) => r.finished_at).flatMap((r) => r.lots));
  const openLots = new Set(rows.find((r) => !r.finished_at)?.lots ?? []);
  const waiting = unannouncedLots((await getLiveCatalog()).lots, finishedLots);
  const picked = waiting.filter((l) => lots.includes(l.lot) && !openLots.has(l.lot));
  const stuckInOpen = lots.filter((x) => openLots.has(x));
  const missing = lots.filter((x) => !picked.some((l) => l.lot === x) && !openLots.has(x));
  return { picked, missing, stuckInOpen };
}

// Shared by a fresh send and a resume: sends to every confirmed subscriber
// with ref = the announcement id, so sendTracked's own uniqueness (email,
// kind, ref) skips anyone a previous (partial) run already reached — a
// resume is just "run this again." Only marks the announcement finished
// when the whole list went out clean (no failures, nothing left for a time
// budget); otherwise it stays open for the next Send/Resume.
async function deliverAnnouncement(id: string, lots: AlertLot[]): Promise<Result> {
  try {
    const db = getSupabaseAdminClient();
    const site = siteUrl();
    const emails = await listConfirmedEmails();
    const deadline = Date.now() + TIME_BUDGET_MS;
    let sent = 0, remaining = 0;
    const failedEmails: string[] = [];
    for (let i = 0; i < emails.length; i++) {
      if (Date.now() > deadline) { remaining = emails.length - i; break; }
      const email = emails[i];
      try {
        const unsub = unsubscribeUrl(site, email);
        if ((await sendTracked({ email, kind: "lot_alert", ref: id, msg: lotAlertEmail({ site, unsubscribeUrl: unsub }, lots), unsubscribeUrl: unsub })) === "sent") sent++;
      } catch (err) {
        failedEmails.push(`${email}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    if (failedEmails.length) await alertOwner(`Lot alert ${id}: ${failedEmails.length} not sent`, failedEmails.join("\n"));
    if (remaining || failedEmails.length) {
      return { ok: true, sent, ...(remaining ? { remaining } : {}), ...(failedEmails.length ? { failed: failedEmails.length } : {}) };
    }
    // Recipient count comes from email_sends (the durable record, including
    // whatever an earlier partial run already sent), not just this call's
    // `sent` counter.
    const { count, error: countErr } = await db.from("email_sends")
      .select("id", { count: "exact", head: true }).eq("kind", "lot_alert").eq("ref", id);
    if (countErr) throw new Error(`recipients count failed: ${JSON.stringify(countErr)}`);
    const { error: updErr } = await db.from("lot_announcements")
      .update({ recipients: count ?? sent, finished_at: new Date().toISOString() }).eq("id", id);
    if (updErr) {
      await alertOwner("Lot alert sent but not marked finished", `announcement ${id}: ${JSON.stringify(updErr)}`);
      return { ok: false, error: `Sent but couldn't mark the announcement finished: ${JSON.stringify(updErr)}` };
    }
    return { ok: true, sent };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await alertOwner(`Lot alert ${id} failed`, message);
    return { ok: false, error: message };
  }
}

export async function sendLotAlertTestAction(lots: string[]): Promise<Result> {
  const owner = await requireOwner();
  try {
    const { picked, missing, stuckInOpen } = await pickLots(lots);
    if (stuckInOpen.length) return { ok: false, error: `An announcement for ${stuckInOpen.join(", ")} is unfinished — resume it.` };
    if (!picked.length || missing.length) return { ok: false, error: `Nothing to send: ${missing.join(", ")} isn't waiting to be announced.` };
    const site = siteUrl(), unsub = unsubscribeUrl(site, owner.email);
    await sendTracked({ email: owner.email, kind: "lot_alert", ref: `test-${Date.now()}`, msg: lotAlertEmail({ site, unsubscribeUrl: unsub }, picked), unsubscribeUrl: unsub });
    return { ok: true, sent: 1 };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function sendLotAlertAction(lots: string[]): Promise<Result> {
  const owner = await requireOwner();
  const { picked, missing, stuckInOpen } = await pickLots(lots);
  if (stuckInOpen.length) return { ok: false, error: `An announcement for ${stuckInOpen.join(", ")} is unfinished — resume it.` };
  if (!picked.length || missing.length) return { ok: false, error: `Nothing to send: ${missing.join(", ")} isn't waiting to be announced.` };
  const db = getSupabaseAdminClient();
  const { data, error } = await db.from("lot_announcements")
    .insert({ lots: picked.map((l) => l.lot), lots_snapshot: picked, sent_by: owner.id }).select("id").single();
  if (error) {
    // The partial unique index (one open announcement at a time) rejects a
    // second insert while one is in flight — resuming it is the fix, not retrying.
    if ((error as { code?: string }).code === "23505") return { ok: false, error: "An announcement is already in progress — resume it first." };
    return { ok: false, error: `Couldn't start the announcement: ${JSON.stringify(error)}` };
  }
  if (!data) return { ok: false, error: "Couldn't start the announcement." };
  return deliverAnnouncement((data as { id: string }).id, picked);
}

// Continues an announcement that didn't finish (a prior run failed partway,
// or hit the time budget): only an unfinished row can be resumed.
export async function resumeLotAlertAction(announcementId: string): Promise<Result> {
  await requireOwner();
  const { data, error } = await getSupabaseAdminClient().from("lot_announcements")
    .select("id, lots_snapshot").eq("id", announcementId).is("finished_at", null).maybeSingle();
  if (error) throw new Error(`lot_announcements read failed: ${JSON.stringify(error)}`);
  if (!data) return { ok: false, error: "Nothing to resume." };
  const row = data as { id: string; lots_snapshot: AlertLot[] };
  return deliverAnnouncement(row.id, row.lots_snapshot);
}
