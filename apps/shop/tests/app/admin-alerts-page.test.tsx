import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ownerStaff } from "../helpers/staff";

const m = vi.hoisted(() => ({ requirePermission: vi.fn(), listPastAlerts: vi.fn() }));
vi.mock("@/lib/dal", () => ({ requirePermission: m.requirePermission }));
vi.mock("@/lib/today/alerts", () => ({ listPastAlerts: m.listPastAlerts }));
vi.mock("@/lib/clock", () => ({ currentMs: () => Date.parse("2026-10-06T15:42:00Z") }));
import PastAlertsPage from "@/app/admin/alerts/page";

const a = (o: Record<string, unknown>) => ({ id: "a1", title: "T", detail: "", count: 1, first_at: "2026-10-06T13:00:00Z", last_at: "2026-10-06T15:00:00Z", resolved_at: null, resolved_by_name: null, note: null, ...o });

describe("/admin/alerts", () => {
  beforeEach(() => { m.requirePermission.mockReset().mockResolvedValue(ownerStaff({ id: "owner1" })); m.listPastAlerts.mockReset(); });

  it("is owner-only", async () => {
    m.requirePermission.mockRejectedValue(new Error("NOT_FOUND"));
    await expect(PastAlertsPage()).rejects.toThrow("NOT_FOUND");
  });

  it("lists open and done alerts with times, notes and who marked them done", async () => {
    m.listPastAlerts.mockResolvedValue([
      a({ id: "o1", title: "Campaign send now failed to start", detail: "\"October restock\": SES throttled\n\n— earlier —\nolder", count: 3 }),
      a({ id: "d1", title: "Email failed to send to a customer", detail: "Subject: Your order AP-1031 has shipped", resolved_at: "2026-10-03T21:00:00Z", resolved_by_name: "Kearney", note: "resent by hand from Orders" }),
    ]);
    render(await PastAlertsPage());
    expect(m.listPastAlerts).toHaveBeenCalledWith(Date.parse("2026-10-06T15:42:00Z"));
    expect(screen.getByRole("heading", { level: 1, name: "Past alerts" })).toBeInTheDocument();
    expect(screen.getByText(/The last 90 days/)).toBeInTheDocument();
    const rows = screen.getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("Open")).toBeInTheDocument();
    expect(within(rows[0]).getByText("3")).toBeInTheDocument();
    expect(within(rows[0]).getByText("\"October restock\": SES throttled")).toBeInTheDocument();
    expect(within(rows[0]).getByText("Full detail")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Done")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Oct 3 · Kearney")).toBeInTheDocument();
    expect(within(rows[1]).getByText(/resent by hand from Orders/)).toBeInTheDocument();
    expect(screen.getByText("Showing 1–2 of 2 · open first, then newest")).toBeInTheDocument();
  });

  it("says so when there are none", async () => {
    m.listPastAlerts.mockResolvedValue([]);
    render(await PastAlertsPage());
    expect(screen.getByText("No alerts in the last 90 days.")).toBeInTheDocument();
  });
});
