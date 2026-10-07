import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ownerStaff } from "../helpers/staff";
import { PERMISSIONS, PERMISSION_LABEL } from "@/lib/staff/permissions";
import { rolePermissions } from "@/lib/staff/roles";

const { requirePermission, listTeam, inquiryDraftsBy, activityFeed } = vi.hoisted(() => ({
  requirePermission: vi.fn(), listTeam: vi.fn(), inquiryDraftsBy: vi.fn(), activityFeed: vi.fn(),
}));
vi.mock("@/lib/dal", () => ({ requirePermission }));
vi.mock("@/lib/staff/data", () => ({ listTeam, inquiryDraftsBy }));
vi.mock("@/lib/audit/feed", () => ({ activityFeed, ACTIVITY_PAGE: 50 }));
vi.mock("@/lib/clock", () => ({ currentMs: () => Date.parse("2026-10-07T15:00:00Z") }));
vi.mock("@/app/admin/team/actions", () => ({ disableStaffAction: vi.fn(), enableStaffAction: vi.fn(), signOutStaffAction: vi.fn() }));
import TeamPage from "@/app/admin/team/page";

const OWNER_ID = "0b6f1c2e-1111-4222-8333-944455556666";
const ASST_ID = "3f1e2d4c-5b6a-4789-8abc-def012345678";
const team = () => ([
  { id: OWNER_ID, name: "Alvester", email: "support@auraprotocols.com", role: "owner" as const, status: "active" as const, lastSignInAt: "2026-10-07T14:14:00Z", signIn: "Google" as const, disabledAt: null, disabledReason: null },
  { id: ASST_ID, name: "Assistant (Claude)", email: "assistant@auraprotocols.com", role: "assistant" as const, status: "active" as const, lastSignInAt: "2026-10-07T13:02:00Z", signIn: "password" as const, disabledAt: null, disabledReason: null },
]);

describe("/admin/team", () => {
  beforeEach(() => {
    requirePermission.mockReset(); requirePermission.mockResolvedValue(ownerStaff({ id: OWNER_ID }));
    listTeam.mockReset(); listTeam.mockResolvedValue(team());
    inquiryDraftsBy.mockReset(); inquiryDraftsBy.mockResolvedValue(3);
    activityFeed.mockReset(); activityFeed.mockResolvedValue({ items: [{}, {}], next: null });
  });

  it("is owner-only — the Assistant login gets a 404 from requirePermission", async () => {
    requirePermission.mockRejectedValueOnce(new Error("NOT_FOUND"));
    await expect(TeamPage()).rejects.toThrow("NOT_FOUND");
    expect(requirePermission).toHaveBeenCalledWith("staff.manage");
  });

  it("shows two rows: Alvester marked You, the Assistant with its kill switches", async () => {
    render(await TeamPage());
    expect(screen.getAllByText("Alvester").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Assistant (Claude)").length).toBeGreaterThan(0);
    expect(screen.getAllByText("You").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Sign out everywhere" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Disable" }).length).toBeGreaterThan(0);
    expect(screen.getByText("2 people")).toBeInTheDocument();
  });

  it("a disabled Assistant shows a Disabled chip, the reason, and Enable instead of the other two", async () => {
    listTeam.mockResolvedValue([team()[0], { ...team()[1], status: "disabled" as const, disabledReason: "Pausing for review" }]);
    render(await TeamPage());
    expect(screen.getAllByText("Disabled").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pausing for review").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Enable" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Sign out everywhere" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Disable" })).toBeNull();
  });

  it("'What the Assistant can do' lists every permission the role has under Can, and every other one under Can't", async () => {
    render(await TeamPage());
    const assistantPerms = rolePermissions("assistant");
    for (const p of PERMISSIONS) {
      const label = PERMISSION_LABEL[p];
      const li = screen.getByText(label).closest("li");
      expect(li, label).not.toBeNull();
      expect(li).toHaveClass(assistantPerms.has(p) ? "yes" : "no");
    }
  });
});
