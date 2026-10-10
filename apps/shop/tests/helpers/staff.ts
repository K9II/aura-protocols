import { rolePermissions, type Staff } from "@/lib/staff/roles";

// Stand-ins for requirePermission()/requireStaff() in admin tests.
export const ownerStaff = (o: Partial<Staff> = {}): Staff => ({
  id: "owner", email: "support@auraprotocols.com", fullName: "Alvester", role: "owner", status: "active",
  isAssistant: false, permissions: rolePermissions("owner"), ...o,
});
export const assistantStaff = (o: Partial<Staff> = {}): Staff => ({
  id: "assistant", email: "assistant@auraprotocols.com", fullName: "Assistant (Claude)", role: "assistant", status: "active",
  isAssistant: true, permissions: rolePermissions("assistant"), ...o,
});
