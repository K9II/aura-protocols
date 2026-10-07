import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const m = vi.hoisted(() => ({
  requireOwner: vi.fn(async () => ({ id: "owner" })), getPayoutDetails: vi.fn(), listPartners: vi.fn(), listW9sAwaitingCheck: vi.fn(),
  latestRunSummary: vi.fn(), listQueuedPayouts: vi.fn(), listPayoutHistory: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({}) }));
vi.mock("@/lib/dal", () => ({ requireOwner: m.requireOwner }));
vi.mock("@/lib/partners/data", () => ({ getPayoutDetails: m.getPayoutDetails, listPartners: m.listPartners, listW9sAwaitingCheck: m.listW9sAwaitingCheck }));
vi.mock("@/lib/partners/ledger", async (orig) => {
  const real = await orig<typeof import("@/lib/partners/ledger")>();
  return { formatRunDate: real.formatRunDate, payoutRunWarning: real.payoutRunWarning, PAYOUT_PAGE_SIZE: 50, latestRunSummary: m.latestRunSummary, listQueuedPayouts: m.listQueuedPayouts, listPayoutHistory: m.listPayoutHistory };
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
  });

  it("shows To send with the changed-details warning and Mark paid", async () => {
    render(await PayoutsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("heading", { level: 1, name: "Payouts" })).toBeInTheDocument();
    expect(screen.getAllByText("$1,104.00").length).toBeGreaterThan(0);
    expect(screen.getByText(/Changed since this payout was queued/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Mark paid" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "NORTHFIELD" })).toHaveAttribute("href", "/admin/partners/p1");
    expect(m.listPayoutHistory).not.toHaveBeenCalled();
  });

  it("shows History on its tab", async () => {
    render(await PayoutsPage({ searchParams: Promise.resolve({ tab: "history" }) }));
    expect(m.listPayoutHistory).toHaveBeenCalledWith(1);
    expect(screen.getByText("ACH-76455")).toBeInTheDocument();
    expect(screen.getByText(/1–1 of 14/)).toBeInTheDocument();
  });

  it("shows the run warning", async () => {
    m.latestRunSummary.mockResolvedValue({ runDate: "2026-10-01", creditCents: 0, creditPartners: 0, finished: false, error: null });
    render(await PayoutsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getAllByRole("alert")[0]).toHaveTextContent(/didn't finish/);  // banner first; the changed-details warning is also an alert
  });
});
