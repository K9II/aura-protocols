import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// vi.mock factories are hoisted above the rest of the module, so the
// vi.fn()s they close over must be too (same pattern as
// tests/app/admin-customers-page.test.tsx) — a plain top-level const here
// throws "Cannot access ... before initialization".
const { requireOwner, stats, admin, camp } = vi.hoisted(() => ({
  requireOwner: vi.fn(async () => ({ id: "owner" })),
  stats: { emailOverview: vi.fn(), sendStats: vi.fn(), attribution: vi.fn(), cartRecovery: vi.fn() },
  admin: { getEmailSettings: vi.fn(), listRuns: vi.fn() },
  camp: { listCampaigns: vi.fn(), campaignCounts: vi.fn(), waitingLots: vi.fn() },
}));
vi.mock("@/lib/dal", () => ({ requireOwner }));
vi.mock("@/lib/email/stats", () => stats);
vi.mock("@/lib/email/admin-data", () => ({ ...admin, AUTOMATION_LABEL: { welcome: "Welcome series", cart: "Cart reminders" } }));
vi.mock("@/lib/email/campaigns/data", () => camp);
vi.mock("@/app/admin/email/actions", () => ({ announceAction: vi.fn(), setAutomationAction: vi.fn() }));
import EmailPage from "@/app/admin/email/page";

describe("/admin/email", () => {
  beforeEach(() => {
    stats.emailOverview.mockResolvedValue({ confirmed: 2310, pending: 96, unsubscribed: 141, sent_30d: 6842, sent_prior_30d: 5800, bounces_30d: 41, complaints_30d: 2 });
    stats.sendStats.mockResolvedValue(new Map([["welcome_1", { sent: 912, bounced: 9, complaints: 0, unsubscribed: 6 }], ["cart_1", { sent: 200, bounced: 1, complaints: 0, unsubscribed: 2 }], ["campaign:k1", { sent: 2196, bounced: 9, complaints: 0, unsubscribed: 11 }]]));
    stats.attribution.mockResolvedValue(new Map([["welcome_1", { orders: 24, revenueCents: 941_000 }], ["campaign:k1", { orders: 47, revenueCents: 1_890_500 }]]));
    stats.cartRecovery.mockResolvedValue({ reminded: 140, recovered: 53, revenueCents: 1_924_000 });
    admin.getEmailSettings.mockResolvedValue({ welcomePaused: false, cartPaused: true });
    admin.listRuns.mockResolvedValue([{ id: "r1", started_at: new Date(Date.now() - 14 * 60_000).toISOString(), finished_at: new Date().toISOString(), welcome_sent: 4, cart_sent: 2, cart_skipped: 0, campaign_sent: 0, failures: 0, error_text: null }]);
    camp.waitingLots.mockResolvedValue([{ compoundName: "BPC-157", strengths: "10 mg", lot: "AP-BPC-2610" }]);
    camp.campaignCounts.mockResolvedValue({ all: 1, draft: 0, scheduled: 0, sent: 1 });
    camp.listCampaigns.mockResolvedValue({ total: 1, rows: [{ id: "k1", kind: "new_lots", status: "sent", name: "Lot AP-SEM-2609 is in", subject: "S", audience: "all", recipients: 2198, started_at: "2026-09-28T15:00:00Z", scheduled_for: null, created_at: "2026-09-27T00:00:00Z", discount_code_id: null }] });
  });

  it("is owner-only", async () => {
    requireOwner.mockRejectedValueOnce(new Error("NOT_FOUND"));
    await expect(EmailPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("NOT_FOUND");
  });

  it("renders health, run line, waiting lots, automations and campaigns", async () => {
    render(await EmailPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("heading", { level: 1, name: "Email" })).toBeInTheDocument();
    expect(screen.getAllByText("2,310").length).toBeGreaterThan(0);
    expect(screen.getAllByText("0.6%").length).toBeGreaterThan(0);
    expect(screen.getByText(/Last run 14 min ago/)).toBeInTheDocument();
    expect(screen.getByText("1 lot waiting to announce")).toBeInTheDocument();
    expect(screen.getAllByText("Welcome series").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Paused").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/53/).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Lot AP-SEM-2609 is in" })[0]).toHaveAttribute("href", "/admin/email/campaigns/k1");
    expect(screen.getAllByText("$18,905").length).toBeGreaterThan(0);
  });

  it("shows an error card (never zeros) when stats fail", async () => {
    stats.emailOverview.mockRejectedValue(new Error("down"));
    render(await EmailPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("alert")).toHaveTextContent("Email numbers couldn't load");
  });
});
