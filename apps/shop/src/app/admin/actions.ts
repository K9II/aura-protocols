"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/dal";
import { recordAdminEvent } from "@/lib/audit/data";
import { currentMs } from "@/lib/clock";
import { resolveAlert } from "@/lib/today/alerts";
import { markInquiriesSeen } from "@/lib/today/data";
import { ALERT_NOTE_MAX } from "@/lib/today/constants";

export type AlertActionState = { ok?: true; error?: string } | null;

// A Postgres timestamptz as Supabase returns it (microseconds and offset kept).
const STAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/;

export async function resolveAlertAction(_prev: AlertActionState, f: FormData): Promise<AlertActionState> {
  const owner = await requireOwner();
  const id = z.string().uuid().safeParse(f.get("id"));
  if (!id.success) return { error: "That alert couldn't be found — reload the page." };
  const note = String(f.get("note") ?? "").trim().slice(0, ALERT_NOTE_MAX) || null;
  if (!(await resolveAlert(id.data, owner.id, note))) return { error: "That alert was already marked done — reload the page." };
  revalidatePath("/admin");
  revalidatePath("/admin/alerts");
  return { ok: true };
}

// Marks inquiries seen up to the newest one the page showed — not "now", so
// one that arrived while the page was open stays new.
export async function markInquiriesSeenAction(f: FormData): Promise<void> {
  const owner = await requireOwner();
  const upTo = String(f.get("upTo") ?? "");
  const ms = Date.parse(upTo);
  // The stamp comes from the database clock; allow for drift against this server.
  if (!STAMP_RE.test(upTo) || !Number.isFinite(ms) || ms > currentMs() + 15 * 60_000) throw new Error("That list changed — reload the page.");
  await markInquiriesSeen(upTo);
  await recordAdminEvent({ area: "today", action: "inquiries_seen", detail: `up to ${upTo}`, actorId: owner.id });
  revalidatePath("/admin");
}
