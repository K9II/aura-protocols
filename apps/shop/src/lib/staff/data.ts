import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import type { RoleId } from "@/lib/staff/roles";

// The staff table (supabase/staff.sql): who can sign in to the command center.
const db = () => getSupabaseAdminClient();
const fail = (what: string, error: unknown): never => { throw new Error(`${what} failed: ${JSON.stringify(error)}`); };

export type StaffRow = { role: RoleId; status: "active" | "disabled" };
export async function readStaffRow(customerId: string): Promise<StaffRow | null> {
  const { data, error } = await db().from("staff").select("role, status").eq("customer_id", customerId).maybeSingle();
  if (error) fail("staff read", error);
  return (data as StaffRow | null) ?? null;
}

export type TeamMember = {
  id: string; name: string; email: string; role: RoleId; status: "active" | "disabled";
  lastSignInAt: string | null; signIn: "Google" | "password"; disabledAt: string | null; disabledReason: string | null;
};
export async function listTeam(): Promise<TeamMember[]> {
  const { data, error } = await db().from("staff").select("customer_id, role, status, disabled_at, disabled_reason, customers!staff_customer_id_fkey(full_name)");
  if (error) fail("team read", error);
  type R = { customer_id: string; role: RoleId; status: "active" | "disabled"; disabled_at: string | null; disabled_reason: string | null; customers: { full_name: string } | null };
  const rows = (data ?? []) as unknown as R[];
  const members = await Promise.all(rows.map(async (r): Promise<TeamMember> => {
    const { data: u, error: uErr } = await db().auth.admin.getUserById(r.customer_id);
    if (uErr) fail("team user read", uErr);
    const providers = (u.user?.app_metadata?.providers as string[] | undefined) ?? [String(u.user?.app_metadata?.provider ?? "")];
    return {
      id: r.customer_id, name: r.customers?.full_name ?? "—", email: u.user?.email ?? "", role: r.role, status: r.status,
      lastSignInAt: u.user?.last_sign_in_at ?? null, signIn: providers.includes("google") ? "Google" : "password",
      disabledAt: r.disabled_at, disabledReason: r.disabled_reason,
    };
  }));
  return members.sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name) : a.role === "owner" ? -1 : 1));
}

// One row, for the event label when a Team action changes someone's status.
export async function getTeamMember(id: string): Promise<TeamMember | null> {
  const members = await listTeam();
  return members.find((m) => m.id === id) ?? null;
}

export type StatusResult = "ok" | "missing" | "self" | "last_owner" | "unchanged";
export async function setStaffStatus(i: { target: string; status: "active" | "disabled"; actorId: string; reason: string | null }): Promise<StatusResult> {
  const { data, error } = await db().rpc("admin_set_staff_status", { p_target: i.target, p_status: i.status, p_actor: i.actorId, p_reason: i.reason });
  if (error) fail("staff status change", error);
  return data as StatusResult;
}

export async function endSessions(userId: string): Promise<number> {
  const { data, error } = await db().rpc("admin_end_sessions", { p_user: userId });
  if (error) fail("end sessions", error);
  return Number(data ?? 0);
}

// Everyone who has ever been staff — Activity's person filter.
export async function staffPeople(): Promise<Array<{ id: string; name: string }>> {
  const { data, error } = await db().from("staff").select("customer_id, customers!staff_customer_id_fkey(full_name)");
  if (error) fail("staff people read", error);
  type R = { customer_id: string; customers: { full_name: string } | null };
  return ((data ?? []) as unknown as R[]).map((r) => ({ id: r.customer_id, name: r.customers?.full_name ?? "—" }));
}

// Counts for the Team page's "Last 7 days" column.
export async function inquiryDraftsBy(customerId: string): Promise<number> {
  const { count, error } = await db().from("inquiries").select("id", { count: "exact", head: true }).eq("draft_by", customerId).not("draft_body", "is", null);
  if (error) fail("draft count", error);
  return count ?? 0;
}
