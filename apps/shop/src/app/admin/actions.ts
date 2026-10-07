"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/dal";
import { resolveAlert } from "@/lib/today/alerts";
import { ALERT_NOTE_MAX } from "@/lib/today/constants";

export type AlertActionState = { ok?: true; error?: string } | null;

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
