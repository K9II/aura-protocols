import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
const { recipientCounts, codeForCampaign, sendStats, attribution } = vi.hoisted(() => ({
  recipientCounts: vi.fn(), codeForCampaign: vi.fn(async () => null), sendStats: vi.fn(), attribution: vi.fn(),
}));
vi.mock("@/lib/email/campaigns/data", () => ({ recipientCounts, codeForCampaign }));
vi.mock("@/lib/email/stats", () => ({ sendStats, attribution }));
vi.mock("@/lib/email/admin-data", () => ({ listAdminEvents: vi.fn(async () => [{ id: "e1", action: "send_started", target: "k1", actor: "o", note: "2198 recipients", at: "2026-09-28T15:00:00Z", actorName: "Kearney Adams" }]) }));
vi.mock("@/app/admin/email/actions", () => ({ stopAction: vi.fn(), copyAction: vi.fn() }));
vi.mock("@/lib/supabase/env", () => ({ siteUrl: () => "https://auraprotocols.com" }));
import CampaignResults from "@/components/admin/email/CampaignResults";

const c = { id: "k1", kind: "new_lots", status: "sent", name: "Lot AP-SEM-2609 is in", subject: "Certified: Semaglutide, lot AP-SEM-2609", preview_text: "", content: { headline: "Lot AP-SEM-2609 is *in.*", body: "", buttonLabel: "", buttonPath: "" }, audience: "all", discount_code_id: null, lots_snapshot: [], scheduled_for: null, started_at: "2026-09-28T15:00:00Z", finished_at: "2026-09-28T15:04:00Z", recipients: 2198, created_by: null, created_at: "", updated_at: "" };

describe("CampaignResults", () => {
  it("sent: figures, as-sent preview, activity, copy", async () => {
    process.env.MAILING_ADDRESS = "Aura Protocols LLC · 1 A St";
    recipientCounts.mockResolvedValue({ pending: 0, sent: 2196, skipped: 0, failed: 2 });
    sendStats.mockResolvedValue(new Map([["campaign:k1", { sent: 2196, bounced: 9, complaints: 0, unsubscribed: 11 }]]));
    attribution.mockResolvedValue(new Map([["campaign:k1", { orders: 47, revenueCents: 1_890_500 }]]));
    render(await CampaignResults({ c: c as never }));
    expect(screen.getAllByText("2,198").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2 failed").length).toBeGreaterThan(0);
    expect(screen.getAllByText("47").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$18,905").length).toBeGreaterThan(0);
    expect(screen.getByTitle("Email preview")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Copy as new draft/ })).toBeInTheDocument();
    expect(screen.getByText(/Sending started by Kearney/)).toBeInTheDocument();
  });

  it("sending: progress and Stop", async () => {
    recipientCounts.mockResolvedValue({ pending: 330, sent: 1977, skipped: 3, failed: 0 });
    sendStats.mockResolvedValue(new Map()); attribution.mockResolvedValue(new Map());
    render(await CampaignResults({ c: { ...c, status: "sending", finished_at: null, recipients: 2310 } as never }));
    expect(screen.getByText("1,980 of 2,310 handled")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Stop sending/ })).toBeInTheDocument();
  });

  it("a send-now error after the campaign already started shows here, not just in a dialog that's gone", async () => {
    recipientCounts.mockResolvedValue({ pending: 1895, sent: 410, skipped: 0, failed: 5 });
    sendStats.mockResolvedValue(new Map()); attribution.mockResolvedValue(new Map());
    render(await CampaignResults({
      c: { ...c, status: "sending", finished_at: null, recipients: 2310 } as never,
      sendError: "410 sent. 5 couldn't be sent; 1,895 still to go — the hourly run will try again.",
    }));
    expect(screen.getByRole("alert")).toHaveTextContent("couldn't be sent");
  });
});
