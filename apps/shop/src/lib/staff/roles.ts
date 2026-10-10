import { PERMISSIONS, type Permission } from "@/lib/staff/permissions";

// v1 roles (Alvester 2026-10-06: "no other hires until business forces me to").
// Adding a role later = an entry here + the staff.role check in supabase/staff.sql.
export const ROLES = [
  { id: "owner", label: "Owner" },
  { id: "assistant", label: "Assistant" },
] as const;
export type RoleId = (typeof ROLES)[number]["id"];
export const ROLE_LABEL: Record<RoleId, string> = { owner: "Owner", assistant: "Assistant" };

// Never granted to the Assistant, whatever the list below says (tests enforce it).
export const NEVER_FOR_ASSISTANT: ReadonlySet<Permission> = new Set<Permission>([
  "staff.manage", "w9.open", "partners.payout_details", "payouts.mark_paid", "credit.adjust",
  "customers.block", "orders.refund", "disputes.submit", "disputes.warnings", "stock.owner_withdrawal",
  "orders.no_charge", "wholesale.margins",
]);

// Claude drafts; Alvester sends. Read everything except partner payout details and W-9s.
const ASSISTANT: readonly Permission[] = [
  ...PERMISSIONS.filter((p) => p.endsWith(".view")),
  "alerts.resolve", "email.draft", "inquiries.draft", "disputes.draft",
];

export function rolePermissions(role: RoleId): ReadonlySet<Permission> {
  if (role === "owner") return new Set(PERMISSIONS);
  if (role === "assistant") return new Set(ASSISTANT.filter((p) => !NEVER_FOR_ASSISTANT.has(p)));
  // Fail closed: a role that isn't one of the two above (a corrupted or
  // future DB value TS can't see at runtime) gets nothing, never the
  // Assistant's permissions by accident.
  return new Set();
}

export type Staff = {
  id: string; email: string; fullName: string;
  role: RoleId; status: "active" | "disabled"; isAssistant: boolean;
  permissions: ReadonlySet<Permission>;
};

// Generic (not Pick<Staff, ...>) so a test can pass `{ ...owner, role: "assistant", ... }`
// without TS's excess-property check tripping on the extra `role` key.
export function can<T extends { status: Staff["status"]; permissions: Staff["permissions"] }>(
  staff: T | null | undefined,
  p: Permission,
): boolean {
  return !!staff && staff.status === "active" && staff.permissions.has(p);
}
