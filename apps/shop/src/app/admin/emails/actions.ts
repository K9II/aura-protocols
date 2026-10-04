"use server";

import { requireOwner } from "@/lib/dal";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { compounds } from "@/data/catalog";
import { unannouncedLots } from "@/lib/email/lots";
import { listConfirmedEmails, sendTracked } from "@/lib/email/data";
import { lotAlertEmail } from "@/lib/emails-marketing";
import { unsubscribeUrl } from "@/lib/email/links";
import { siteUrl } from "@/lib/supabase/env";
import { alertOwner } from "@/lib/notify";

type Result = { ok: true; sent: number; failed?: number } | { ok: false; error: string };

async function announcedLotNumbers(): Promise<Set<string>> {
  const { data, error } = await getSupabaseAdminClient().from("lot_announcements").select("lots, finished_at");
  if (error) throw new Error(`lot_announcements read failed: ${JSON.stringify(error)}`);
  // An unfinished announcement still counts: pressing Send again resumes it
  // (resumeLotAlertAction in Part 1b), it never starts a second one.
  return new Set(((data ?? []) as { lots: string[] }[]).flatMap((r) => r.lots));
}

async function pickLots(lots: string[]) {
  const waiting = unannouncedLots(compounds, await announcedLotNumbers());
  const picked = waiting.filter((l) => lots.includes(l.lot));
  return { picked, missing: lots.filter((x) => !picked.some((l) => l.lot === x)) };
}

export async function sendLotAlertTestAction(lots: string[]): Promise<Result> {
  const owner = await requireOwner();
  const { picked, missing } = await pickLots(lots);
  if (!picked.length || missing.length) return { ok: false, error: `Nothing to send: ${missing.join(", ")} isn't waiting to be announced.` };
  const site = siteUrl(), unsub = unsubscribeUrl(site, owner.email);
  await sendTracked({ email: owner.email, kind: "lot_alert", ref: `test-${Date.now()}`, msg: lotAlertEmail({ site, unsubscribeUrl: unsub }, picked), unsubscribeUrl: unsub });
  return { ok: true, sent: 1 };
}

export async function sendLotAlertAction(lots: string[]): Promise<Result> {
  const owner = await requireOwner();
  const { picked, missing } = await pickLots(lots);
  if (!picked.length || missing.length) return { ok: false, error: `Nothing to send: ${missing.join(", ")} isn't waiting to be announced.` };
  const db = getSupabaseAdminClient();
  const { data, error } = await db.from("lot_announcements").insert({ lots: picked.map((l) => l.lot), sent_by: owner.id }).select("id").single();
  if (error || !data) return { ok: false, error: `Couldn't start the announcement: ${JSON.stringify(error)}` };
  const id = (data as { id: string }).id;

  const site = siteUrl();
  let sent = 0;
  const failed: string[] = [];
  for (const email of await listConfirmedEmails()) {
    try {
      const unsub = unsubscribeUrl(site, email);
      if ((await sendTracked({ email, kind: "lot_alert", ref: id, msg: lotAlertEmail({ site, unsubscribeUrl: unsub }, picked), unsubscribeUrl: unsub })) === "sent") sent++;
    } catch (err) {
      failed.push(`${email}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  await db.from("lot_announcements").update({ recipients: sent, finished_at: failed.length ? null : new Date().toISOString() }).eq("id", id);
  if (failed.length) await alertOwner(`Lot alert: ${failed.length} not sent`, failed.join("\n"));
  return { ok: true, sent, failed: failed.length };
}
