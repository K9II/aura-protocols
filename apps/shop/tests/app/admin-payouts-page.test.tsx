import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const m = vi.hoisted(() => ({
  requireOwner: vi.fn(async () => ({ id: "owner" })), getPayoutDetails: vi.fn(), listPartners: vi.fn(), listW9sAwaitingCheck: vi.fn(),
  latestRunSummary: vi.fn(), listQueuedPayouts: vi.fn(), listPayoutHistory: vi.fn(), countPayoutHistory: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({}) }));
vi.mock("@/lib/dal", () => ({ requireOwner: m.requireOwner }));
vi.mock("@/lib/partners/data", () => ({ getPayoutDetails: m.getPayoutDetails, listPartners: m.listPartners, listW9sAwaitingCheck: m.listW9sAwaitingCheck }));
vi.mock("@/lib/partners/ledger", async (orig) => {
  const real = await orig<typeof import("@/lib/partners/ledger")>();
  return {
    formatRunDate: real.formatRunDate, payoutRunWarning: real.payoutRunWarning, PAYOUT_PAGE_SIZE: 50,
    latestRunSummary: m.latestRunSummary, listQueuedPayouts: m.listQueuedPayouts, listPayoutHistory: m.listPayoutHistory, countPayoutHistory: m.countPayoutHistory,
  };
});
vi.mock("@/app/admin/payouts/actions", () => ({ markPayoutPaidAction: vi.fn(), openW9Action: vi.fn(), markW9CheckedAction: vi.fn() }));
import PayoutsPage from "@/app/admin/payouts/page";

const queued = { id: "y1", partner_id: "p1", run_date: "2026-10-01", cash_cents: 110_400, credit_cents: 0, status: "queued", details_hint: "ACH ••••0912", partners: { code: "NORTHFIELD", payout_method: "zelle", payout_details_hint: "Zelle ops@northfield…", customer_id: "c1" } };

describe("/admin/payouts", () => {
  beforeEach(() => {
    m.latestRunSummary.mockResolvedValue({ runDate: "2026-10-01", creditCents: 19_266, creditPartners: 1, finished: true, error: null });
    m.listQueuedPayouts.mockResolvedValue([queued]);
    m.listPartners.mockResolvedValue([]);
    m.listW9sAwaitingCheck.mockResolvedValue([]);
    m.getPayoutDetails.mockResolvedValue(null);
    m.listPayoutHistory.mockResolvedValue({ rows: [{ id: "y0", run_date: "2026-09-15", cash_cents: 88_000, credit_cents: 0, status: "paid", method: "ach", reference: "ACH-76455", paid_at: "2026-09-16T15:00:00Z", partner_id: "p1", partners: { code: "NORTHFIELD" } }], total: 14 });
    m.countPayoutHistory.mockResolvedValue(14);
  });

  it("shows To send with the changed-details warning and Mark paid, as both a desktop table and phone cards", async () => {
    const { container } = render(await PayoutsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("heading", { level: 1, name: "Payouts" })).toBeInTheDocument();
    // Once in the "Cash to send" KPI, once per rendering of the queued row (desktop + phone).
    expect(screen.getAllByText("$1,104.00").length).toBe(3);
    expect(container.querySelector("table.a-only-desk")).not.toBeNull();
    expect(container.querySelector(".a-plist.a-only-phone .tot")).toHaveTextContent("$1,104.00");
    expect(screen.getAllByText(/Changed since this payout was queued/).length).toBe(2);
    expect(screen.getAllByRole("button", { name: "Mark paid" }).length).toBe(2);
    expect(screen.getAllByRole("link", { name: "NORTHFIELD" })[0]).toHaveAttribute("href", "/admin/partners/p1");
    expect(m.listPayoutHistory).not.toHaveBeenCalled();
    expect(m.countPayoutHistory).toHaveBeenCalled();
    expect(screen.getByRole("link", { name: /History\s*14/ })).toBeInTheDocument();
  });

  it("shows History on its tab, as both a desktop table and phone cards", async () => {
    render(await PayoutsPage({ searchParams: Promise.resolve({ tab: "history" }) }));
    expect(m.listPayoutHistory).toHaveBeenCalledWith(1);
    expect(screen.getAllByText("ACH-76455").length).toBe(2);
    expect(screen.getByText(/1–1 of 14/)).toBeInTheDocument();
  });

  it("shows 'No rows on this page' past the end of History", async () => {
    m.listPayoutHistory.mockResolvedValue({ rows: [], total: 14 });
    render(await PayoutsPage({ searchParams: Promise.resolve({ tab: "history", page: "9" }) }));
    expect(screen.getByText("No rows on this page.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to page 1" })).toHaveAttribute("href", "/admin/payouts?tab=history");
  });

  it("shows the run warning", async () => {
    m.latestRunSummary.mockResolvedValue({ runDate: "2026-10-01", creditCents: 0, creditPartners: 0, finished: false, error: null });
    render(await PayoutsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getAllByRole("alert")[0]).toHaveTextContent(/didn't finish/);  // banner first; the changed-details warning is also an alert
  });
});
