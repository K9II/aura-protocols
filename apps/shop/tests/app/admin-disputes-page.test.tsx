import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { DISPUTE_ID, listRow, warningRow } from "../helpers/dispute-fixtures";
import { ownerStaff, assistantStaff } from "../helpers/staff";

const m = vi.hoisted(() => ({ requirePermission: vi.fn(), listDisputes: vi.fn(), listWarnings: vi.fn(), disputeRateCounts: vi.fn() }));
vi.mock("@/lib/dal", () => ({ requirePermission: m.requirePermission }));
vi.mock("@/lib/disputes/data", () => ({ listDisputes: m.listDisputes, listWarnings: m.listWarnings, disputeRateCounts: m.disputeRateCounts }));
vi.mock("@/lib/clock", () => ({ currentMs: () => Date.parse("2026-10-07T15:42:00Z") }));
vi.mock("@/app/admin/disputes/actions", () => ({ refundEarlyWarningAction: vi.fn(), watchEarlyWarningAction: vi.fn() }));
import DisputesPage from "@/app/admin/disputes/page";

describe("/admin/disputes", () => {
  beforeEach(() => {
    for (const f of Object.values(m)) f.mockReset();
    m.requirePermission.mockResolvedValue(ownerStaff({ id: "owner1" }));
    m.disputeRateCounts.mockResolvedValue({ disputes: 3, charges: 1412 });
    m.listDisputes.mockResolvedValue([
      listRow({ draft_saved_at: "2026-10-06T15:31:00Z" }),
      listRow({ id: "d2", reason: "fraudulent", evidence_due_by: "2026-10-24T23:59:59Z", amount_cents: 25800 }, { number: "AP-1036", customerName: "K. Mercer", email: "kmercer@example.com" }),
      listRow({ id: "d3", status: "won", closed_at: "2026-09-30T16:02:00Z", amount_cents: 32900 }, { number: "AP-1012", customerName: "M. Okafor" }),
    ]);
    m.listWarnings.mockResolvedValue([
      warningRow(),
      warningRow({ id: "w2", fraud_type: "card_never_received", created_at: "2026-10-05T18:00:00Z" }, { number: "AP-1029", status: "shipped", shippedAt: "2026-09-20T18:00:00Z", customerName: "T. Nguyen", totalCents: 9600 }),
      warningRow({ id: "w3", resolved_action: "refunded", resolved_at: "2026-09-18T20:00:00Z" }, { number: "AP-1007", customerName: "S. Lindqvist", totalCents: 6950 }),
    ]);
  });

  it("is owner-only", async () => {
    m.requirePermission.mockRejectedValue(new Error("NOT_FOUND"));
    await expect(DisputesPage()).rejects.toThrow("NOT_FOUND");
  });

  it("rate strip, chargebacks by deadline, early warnings with their suggested action, history", async () => {
    render(await DisputesPage());
    expect(screen.getByRole("heading", { level: 1, name: "Disputes" })).toBeInTheDocument();
    expect(screen.getByText("0.21%")).toBeInTheDocument();
    expect(screen.getByText("3 of 1,412 payments · Stripe reviews at 0.75%")).toBeInTheDocument();
    expect(screen.getByText("next due Oct 9")).toBeInTheDocument();
    expect(m.disputeRateCounts).toHaveBeenCalledWith("2026-07-09T15:42:00.000Z");

    const needs = screen.getByRole("region", { name: "Needs response" });
    const rows = within(needs).getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("AP-1031")).toBeInTheDocument();
    expect(within(rows[0]).getByText("Draft saved")).toBeInTheDocument();
    expect(within(rows[0]).getByText("2 days left")).toBeInTheDocument();
    expect(within(rows[0]).getByRole("link", { name: "Respond" })).toHaveAttribute("href", `/admin/disputes/${DISPUTE_ID}`);
    expect(within(rows[1]).getByText("Not started")).toBeInTheDocument();
    expect(within(rows[1]).getByText("17 days left")).toBeInTheDocument();

    const efw = screen.getByRole("region", { name: "Early fraud warnings" });
    expect(within(efw).getAllByRole("button", { name: "Cancel and refund…" }).length).toBeGreaterThan(0);
    expect(within(efw).getAllByRole("button", { name: "Watch" }).length).toBeGreaterThan(0);
    expect(within(efw).getByText("Paid · not shipped")).toBeInTheDocument();
    expect(within(efw).getByText("Unauthorized use of card")).toBeInTheDocument();
    expect(within(efw).queryByText("AP-1007")).toBeNull();

    const history = screen.getByRole("region", { name: "History" });
    expect(within(history).getByRole("link", { name: "AP-1012" })).toHaveAttribute("href", "/admin/disputes/d3");
    expect(within(history).getByText("Won")).toBeInTheDocument();
    expect(within(history).getByText("Refunded before shipping")).toBeInTheDocument();
  });

  it("Assistant: no early-warning actions", async () => {
    m.requirePermission.mockResolvedValue(assistantStaff());
    render(await DisputesPage());
    const efw = screen.getByRole("region", { name: "Early fraud warnings" });
    expect(within(efw).queryByRole("button", { name: "Cancel and refund…" })).toBeNull();
    expect(within(efw).queryByRole("button", { name: "Watch" })).toBeNull();
  });

  it("says so when there's nothing", async () => {
    m.listDisputes.mockResolvedValue([]);
    m.listWarnings.mockResolvedValue([]);
    m.disputeRateCounts.mockResolvedValue({ disputes: 0, charges: 0 });
    render(await DisputesPage());
    expect(screen.getByText("No chargebacks need a response.")).toBeInTheDocument();
    expect(screen.getByText("No open warnings.")).toBeInTheDocument();
    expect(screen.getByText("Nothing here yet.")).toBeInTheDocument();
    expect(screen.getByText("nothing due")).toBeInTheDocument();
  });
});
