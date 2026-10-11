import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";

const base = {
  id: "p1", code: "LABNOTES", status: "approved", partner_type: "academic_researcher", tier_pct: 10, lifetime_cents: 52020,
  payout_pref: "split", split_cash_pct: 60, cash_carry_cents: 1764, payout_details_hint: "ACH · checking ••••6789 · Test Bank",
  w9_uploaded_at: "2026-10-01T00:00:00Z", w9_checked_at: "2026-10-01T00:00:00Z", approved_at: "2026-10-01T22:04:14Z", created_at: "2026-10-01T22:04:50Z",
};
let partner: typeof base = base;
vi.mock("@/lib/dal", () => ({ requirePartner: async () => ({ customer: { id: "u1", email: "b@example.com" }, partner }) }));
vi.mock("@/lib/partners/data", () => ({ clicksSince: async () => 2 }));
vi.mock("@/lib/partners/ledger", () => ({
  creditBalance: async () => 3050,
  partnerLedger: async () => ({
    byState: { pending: 1755, clearing: 3447, payable: 0, paid: 1764, void: 441 }, ordersLast30: 5, receivedCents: 0, payouts: [],
    recent: [
      { id: "c1", state: "clearing", clears_at: "2026-10-26T12:00:00Z", created_at: "2026-10-11T12:00:00Z", attributed_by: "code", base_cents: 13140, rate_pct: 10, amount_cents: 1314, orders: { order_number: "AP-1053" } },
      { id: "c2", state: "void", clears_at: null, created_at: "2026-10-01T12:00:00Z", attributed_by: "code", base_cents: 4410, rate_pct: 10, amount_cents: 441, orders: { order_number: "AP-1011" } },
    ],
  }),
}));
vi.mock("@/lib/supabase/env", () => ({ siteUrl: () => "https://auraprotocols.com" }));
vi.mock("@/components/partners/PayoutSettings", () => ({ default: () => <div>payout settings</div> }));
vi.mock("@/components/partners/W9Upload", () => ({ default: () => <div>w9</div> }));
vi.mock("@/components/partners/ChangeCode", () => ({ default: () => <a href="#change">Change code</a> }));
vi.mock("@/components/partners/CopyButton", () => ({ default: () => <button type="button">Copy</button> }));
import PartnerDashboard from "@/app/partners/page";

describe("/partners (Option A)", () => {
  beforeEach(() => { partner = base; });

  it("shows the record placard, Cash owed instead of Payable, and partner-word status chips", async () => {
    render(await PartnerDashboard());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Your partner dashboard.");
    expect(screen.getByText("Partner record · Aura Protocols")).toBeInTheDocument();
    expect(screen.getByText("Academic researcher")).toBeInTheDocument();
    expect(screen.getByText("60% cash · 40% credit")).toBeInTheDocument();
    expect(screen.getByText("Cash owed")).toBeInTheDocument();
    expect(screen.getByText("$17.64")).toBeInTheDocument();
    expect(screen.getByText("paid once it reaches $100")).toBeInTheDocument();
    expect(screen.queryByText(/^Payable$/)).toBeNull();
    const table = screen.getByRole("table", { name: "Your commission" });
    expect(within(table).getAllByText("Clears Oct 26")).toHaveLength(1);
    expect(within(table).getByText("Refunded")).toBeInTheDocument();
    expect(within(table).getByText("Oct 11 · $131.40 order")).toBeInTheDocument();
    expect(screen.getByText("you're here")).toBeInTheDocument();
  });

  it("with no cash held, Cash owed says when the next cash payout is", async () => {
    partner = { ...base, cash_carry_cents: 0 };
    render(await PartnerDashboard());
    expect(screen.getByText(/^next cash payout /)).toBeInTheDocument();
  });

  it("an applicant still sees the simple status page", async () => {
    partner = { ...base, status: "applied" };
    render(await PartnerDashboard());
    expect(screen.getByText(/reviewing your application/)).toBeInTheDocument();
    expect(screen.queryByText("Cash owed")).toBeNull();
  });
});
