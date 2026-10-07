import { describe, it, expect, vi, beforeEach } from "vitest";
import { ownerStaff } from "../helpers/staff";

const requirePermission = vi.fn();
const data = { setStaffStatus: vi.fn(), endSessions: vi.fn(), getTeamMember: vi.fn() };
const audit = { recordAdminEvent: vi.fn() };
const notify = { alertOwner: vi.fn() };
vi.mock("@/lib/dal", () => ({ requirePermission }));
vi.mock("@/lib/staff/data", () => data);
vi.mock("@/lib/audit/data", () => audit);
vi.mock("@/lib/notify", () => notify);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const OWNER_ID = "0b6f1c2e-1111-4222-8333-944455556666";
const ID = "3f1e2d4c-5b6a-4789-8abc-def012345678";
function fd(v: Record<string, string>) { const f = new FormData(); for (const [k, x] of Object.entries(v)) f.set(k, x); return f; }

describe("team actions", () => {
  beforeEach(() => {
    vi.resetModules();
    requirePermission.mockReset(); requirePermission.mockResolvedValue(ownerStaff({ id: OWNER_ID }));
    for (const f of [...Object.values(data), ...Object.values(audit), ...Object.values(notify)]) f.mockReset();
    data.getTeamMember.mockResolvedValue({ id: ID, name: "Assistant (Claude)" });
  });

  it("every action requires staff.manage", async () => {
    requirePermission.mockRejectedValue(new Error("NOT_FOUND"));
    const a = await import("@/app/admin/team/actions");
    await expect(a.disableStaffAction(fd({ id: ID, reason: "" }))).rejects.toThrow("NOT_FOUND");
    await expect(a.enableStaffAction(fd({ id: ID }))).rejects.toThrow("NOT_FOUND");
    await expect(a.signOutStaffAction(fd({ id: ID }))).rejects.toThrow("NOT_FOUND");
    expect(data.setStaffStatus).not.toHaveBeenCalled();
  });

  it("disable: sets status, ends sessions and logs the event", async () => {
    data.setStaffStatus.mockResolvedValue("ok");
    const { disableStaffAction } = await import("@/app/admin/team/actions");
    await disableStaffAction(fd({ id: ID, reason: "Pausing while I review last week's drafts" }));
    expect(requirePermission).toHaveBeenCalledWith("staff.manage");
    expect(data.setStaffStatus).toHaveBeenCalledWith({ target: ID, status: "disabled", actorId: OWNER_ID, reason: "Pausing while I review last week's drafts" });
    expect(data.endSessions).toHaveBeenCalledWith(ID);
    expect(audit.recordAdminEvent).toHaveBeenCalledWith({ area: "staff", action: "staff_disabled", targetId: ID, label: "Assistant (Claude)", detail: "Pausing while I review last week's drafts", actorId: OWNER_ID });
  });

  it("disable: a blank reason is sent as null", async () => {
    data.setStaffStatus.mockResolvedValue("ok");
    const { disableStaffAction } = await import("@/app/admin/team/actions");
    await disableStaffAction(fd({ id: ID, reason: "  " }));
    expect(data.setStaffStatus).toHaveBeenCalledWith({ target: ID, status: "disabled", actorId: OWNER_ID, reason: null });
  });

  it("disable: the event is recorded even if ending sessions then fails — and the failure alerts Alvester and still throws", async () => {
    data.setStaffStatus.mockResolvedValue("ok");
    data.endSessions.mockRejectedValue(new Error("auth api down"));
    const { disableStaffAction } = await import("@/app/admin/team/actions");
    await expect(disableStaffAction(fd({ id: ID, reason: "" }))).rejects.toThrow("auth api down");
    expect(audit.recordAdminEvent).toHaveBeenCalledWith({ area: "staff", action: "staff_disabled", targetId: ID, label: "Assistant (Claude)", detail: null, actorId: OWNER_ID });
    expect(notify.alertOwner).toHaveBeenCalledWith("Team sign-out failed", "Assistant (Claude): auth api down");
  });

  it("disable: self/last_owner throw a plain sentence and log nothing", async () => {
    const { disableStaffAction } = await import("@/app/admin/team/actions");
    data.setStaffStatus.mockResolvedValue("self");
    await expect(disableStaffAction(fd({ id: ID, reason: "" }))).rejects.toThrow(/own login/);
    data.setStaffStatus.mockResolvedValue("last_owner");
    await expect(disableStaffAction(fd({ id: ID, reason: "" }))).rejects.toThrow(/Owner/);
    expect(data.endSessions).not.toHaveBeenCalled();
    expect(audit.recordAdminEvent).not.toHaveBeenCalled();
  });

  it("enable: sets status active, logs staff_enabled, never ends sessions", async () => {
    data.setStaffStatus.mockResolvedValue("ok");
    const { enableStaffAction } = await import("@/app/admin/team/actions");
    await enableStaffAction(fd({ id: ID }));
    expect(data.setStaffStatus).toHaveBeenCalledWith({ target: ID, status: "active", actorId: OWNER_ID, reason: null });
    expect(data.endSessions).not.toHaveBeenCalled();
    expect(audit.recordAdminEvent).toHaveBeenCalledWith({ area: "staff", action: "staff_enabled", targetId: ID, label: "Assistant (Claude)", detail: null, actorId: OWNER_ID });
  });

  it("enable: self/last_owner throw and log nothing", async () => {
    const { enableStaffAction } = await import("@/app/admin/team/actions");
    data.setStaffStatus.mockResolvedValue("self");
    await expect(enableStaffAction(fd({ id: ID }))).rejects.toThrow();
    data.setStaffStatus.mockResolvedValue("last_owner");
    await expect(enableStaffAction(fd({ id: ID }))).rejects.toThrow(/Owner/);
    expect(audit.recordAdminEvent).not.toHaveBeenCalled();
  });

  it("sign out everywhere: refuses yourself, otherwise ends sessions and logs the count", async () => {
    const { signOutStaffAction } = await import("@/app/admin/team/actions");
    await expect(signOutStaffAction(fd({ id: OWNER_ID }))).rejects.toThrow("Use Sign out to end your own session.");
    expect(data.endSessions).not.toHaveBeenCalled();
    data.endSessions.mockResolvedValue(2);
    await signOutStaffAction(fd({ id: ID }));
    expect(data.endSessions).toHaveBeenCalledWith(ID);
    expect(audit.recordAdminEvent).toHaveBeenCalledWith({ area: "staff", action: "staff_signed_out", targetId: ID, label: "Assistant (Claude)", detail: "2 sessions", actorId: OWNER_ID });
  });

  it("sign out everywhere: a failure to end sessions alerts Alvester and still throws", async () => {
    data.endSessions.mockRejectedValue(new Error("auth api down"));
    const { signOutStaffAction } = await import("@/app/admin/team/actions");
    await expect(signOutStaffAction(fd({ id: ID }))).rejects.toThrow("auth api down");
    expect(notify.alertOwner).toHaveBeenCalledWith("Team sign-out failed", "Assistant (Claude): auth api down");
    expect(audit.recordAdminEvent).not.toHaveBeenCalled();
  });

  it("a bad id throws (stale page)", async () => {
    const { disableStaffAction, enableStaffAction, signOutStaffAction } = await import("@/app/admin/team/actions");
    await expect(disableStaffAction(fd({ id: "nope", reason: "" }))).rejects.toThrow("That person changed or doesn't exist. Reload the page.");
    await expect(enableStaffAction(fd({ id: "nope" }))).rejects.toThrow("That person changed or doesn't exist. Reload the page.");
    await expect(signOutStaffAction(fd({ id: "nope" }))).rejects.toThrow("That person changed or doesn't exist. Reload the page.");
    expect(data.setStaffStatus).not.toHaveBeenCalled();
  });
});
