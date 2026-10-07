"use server";

// Team page (spec 2026-10-06-admin-staff-logins-design.md): Sign out
// everywhere, Disable and Enable. Owner-only (staff.manage).
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/dal";
import { endSessions, getTeamMember, setStaffStatus } from "@/lib/staff/data";
import { recordAdminEvent } from "@/lib/audit/data";

const STALE = "That person changed or doesn't exist. Reload the page.";
const str = (f: FormData, k: string) => String(f.get(k) ?? "");

function targetId(f: FormData): string {
  const id = z.string().uuid().safeParse(f.get("id"));
  if (!id.success) throw new Error(STALE);
  return id.data;
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
    await endSessions(id);
    const member = await getTeamMember(id);
    await recordAdminEvent({ area: "staff", action: "staff_disabled", targetId: id, label: member?.name ?? null, detail: reason, actorId: owner.id });
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
  const n = await endSessions(id);
  const member = await getTeamMember(id);
  await recordAdminEvent({ area: "staff", action: "staff_signed_out", targetId: id, label: member?.name ?? null, detail: `${n} session${n === 1 ? "" : "s"}`, actorId: owner.id });
  revalidatePath("/admin/team");
}
