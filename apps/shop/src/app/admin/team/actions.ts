"use server";

// Team page (spec 2026-10-06-admin-staff-logins-design.md): Sign out
// everywhere, Disable and Enable. Owner-only (staff.manage).
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/dal";
import { endSessions, getTeamMember, setStaffStatus } from "@/lib/staff/data";
import { recordAdminEvent } from "@/lib/audit/data";
import { alertOwner } from "@/lib/notify";

const STALE = "That person changed or doesn't exist. Reload the page.";
const str = (f: FormData, k: string) => String(f.get(k) ?? "");

function targetId(f: FormData): string {
  const id = z.string().uuid().safeParse(f.get("id"));
  if (!id.success) throw new Error(STALE);
  return id.data;
}

// endSessions is the step most likely to fail (it calls the auth API) and
// the one whose failure matters least to the record already made — wrap it
// so a failure still reaches Alvester (an owner alert, not just a thrown
// error the page happens to show) and still rethrows (loud either way).
async function endSessionsOrAlert(id: string, name: string | null): Promise<number> {
  try {
    return await endSessions(id);
  } catch (err) {
    await alertOwner("Team sign-out failed", `${name ?? "a team login"}: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
}

export async function disableStaffAction(f: FormData): Promise<void> {
  const owner = await requirePermission("staff.manage");
  const id = targetId(f);
  const reason = str(f, "reason").trim().slice(0, 200) || null;
  const result = await setStaffStatus({ target: id, status: "disabled", actorId: owner.id, reason });
  if (result === "missing") throw new Error(STALE);
  if (result === "self") throw new Error("You can't disable your own login.");
  if (result === "last_owner") throw new Error("There has to be at least one active Owner.");
  if (result === "ok") {
    // Record the event right after the status change succeeds, before
    // ending sessions — so a later failure (endSessions, or this lookup)
    // never costs the Activity entry for a disable that already happened.
    const member = await getTeamMember(id);
    await recordAdminEvent({ area: "staff", action: "staff_disabled", targetId: id, label: member?.name ?? null, detail: reason, actorId: owner.id });
    await endSessionsOrAlert(id, member?.name ?? null);
  }
  revalidatePath("/admin/team");
}

export async function enableStaffAction(f: FormData): Promise<void> {
  const owner = await requirePermission("staff.manage");
  const id = targetId(f);
  const result = await setStaffStatus({ target: id, status: "active", actorId: owner.id, reason: null });
  if (result === "missing") throw new Error(STALE);
  if (result === "self") throw new Error("You can't change your own login this way.");
  if (result === "last_owner") throw new Error("There has to be at least one active Owner.");
  if (result === "ok") {
    const member = await getTeamMember(id);
    await recordAdminEvent({ area: "staff", action: "staff_enabled", targetId: id, label: member?.name ?? null, detail: null, actorId: owner.id });
  }
  revalidatePath("/admin/team");
}

export async function signOutStaffAction(f: FormData): Promise<void> {
  const owner = await requirePermission("staff.manage");
  const id = targetId(f);
  if (id === owner.id) throw new Error("Use Sign out to end your own session.");
  const member = await getTeamMember(id);
  const n = await endSessionsOrAlert(id, member?.name ?? null);
  await recordAdminEvent({ area: "staff", action: "staff_signed_out", targetId: id, label: member?.name ?? null, detail: `${n} session${n === 1 ? "" : "s"}`, actorId: owner.id });
  revalidatePath("/admin/team");
}
