import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { CUSTOMER_ID, DISPUTE_ID, disputeCase } from "../helpers/dispute-fixtures";

const m = vi.hoisted(() => ({ requireOwner: vi.fn(), getDisputeCase: vi.fn() }));
vi.mock("@/lib/dal", () => ({ requireOwner: m.requireOwner }));
vi.mock("@/lib/disputes/data", () => ({ getDisputeCase: m.getDisputeCase }));
vi.mock("@/lib/disputes/pdf", () => ({ buildEvidencePdf: async () => ({ bytes: new Uint8Array(84 * 1024), pages: 3 }) }));
vi.mock("@/lib/clock", () => ({ currentMs: () => Date.parse("2026-10-07T15:42:00Z") }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("@/app/admin/disputes/actions", () => ({ saveDisputeDraftAction: vi.fn(), submitDisputeAction: vi.fn() }));
vi.mock("@/app/admin/customers/actions", () => ({ blockAction: vi.fn() }));
import DisputePage from "@/app/admin/disputes/[id]/page";

const props = (id = DISPUTE_ID) => ({ params: Promise.resolve({ id }) });

describe("/admin/disputes/[id]", () => {
  beforeEach(() => {
    for (const f of Object.values(m)) f.mockReset();
    m.requireOwner.mockResolvedValue({ id: "owner1" });
    m.getDisputeCase.mockResolvedValue(disputeCase({ draft_saved_at: "2026-10-06T15:31:00Z", funds_withdrawn_at: "2026-10-01T22:12:05Z" }));
  });

  it("is owner-only and 404s a bad id or a missing chargeback", async () => {
    m.requireOwner.mockRejectedValueOnce(new Error("NOT_FOUND"));
    await expect(DisputePage(props())).rejects.toThrow("NOT_FOUND");
    await expect(DisputePage(props("nope"))).rejects.toThrow("NOT_FOUND");
    m.getDisputeCase.mockResolvedValue(null);
    await expect(DisputePage(props())).rejects.toThrow("NOT_FOUND");
  });

  it("respond: header with the deadline, the evidence form pre-filled from the records, the PDF and the activity", async () => {
    render(await DisputePage(props()));
    expect(screen.getByRole("heading", { level: 1, name: /Chargeback on AP-1031/ })).toHaveTextContent("Draft saved");
    expect(screen.getByText(/Opened Oct 1 by the card issuer · draft saved to Stripe Oct 6, 9:31 am/)).toBeInTheDocument();
    expect(screen.getByText("Oct 9")).toHaveClass("red");
    expect(screen.getByText("2 days left · 5:59 pm MT")).toBeInTheDocument();
    expect(screen.getByText("withdrawn Oct 1 + $15.00 fee")).toBeInTheDocument();
    expect((screen.getByRole("textbox", { name: "Cover letter" }) as HTMLTextAreaElement).value).toContain("The cardholder states that order AP-1031 was not received.");
    expect(screen.getByLabelText("Tracking number")).toHaveValue("9400111899223401552788");
    expect(screen.getByText("Compliance scan passed · edit freely; it is checked again when you save and submit.")).toBeInTheDocument();
    expect(screen.getByText("September 14, 2026, 7:02 pm MT · terms v2026-09-27")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save draft" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit to Stripe…" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Download PDF" })).toHaveAttribute("href", `/admin/disputes/${DISPUTE_ID}/evidence.pdf`);
    expect(screen.getByText(/3 pages · 84 KB/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Block customer…" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dana Whitfield" })).toHaveAttribute("href", `/admin/customers/${CUSTOMER_ID}`);
    expect(screen.getByText("Chargeback opened · not received")).toBeInTheDocument();
  });

  it("a saved draft is what the form shows", async () => {
    const c = disputeCase({ draft_saved_at: "2026-10-06T15:31:00Z" });
    c.dispute.draft = {
      uncategorized_text: "My edited letter", shipping_carrier: "USPS", shipping_tracking_number: "X1", shipping_date: "September 22, 2026",
      shipping_address: "A", customer_name: "Dana Whitfield", customer_email_address: "dana.w@example.com", product_description: "Research chemicals",
    };
    m.getDisputeCase.mockResolvedValue(c);
    render(await DisputePage(props()));
    expect(screen.getByRole("textbox", { name: "Cover letter" })).toHaveValue("My edited letter");
  });

  it("won: read-only, outcome and fee, Download PDF in the header, no form", async () => {
    m.getDisputeCase.mockResolvedValue(disputeCase({
      status: "won", outcome: "won", closed_at: "2026-09-30T16:02:00Z", evidence_submitted: true, submitted_at: "2026-09-12T21:40:00Z",
      funds_reinstated_at: "2026-09-30T16:02:00Z", amount_cents: 32900,
    }));
    render(await DisputePage(props()));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Won");
    expect(screen.getByText("The bank decided for you. $329.00 was returned to your balance on Sep 30.")).toBeInTheDocument();
    expect(screen.getByText("Stripe's dispute fee")).toBeInTheDocument();
    expect(screen.getByText("as submitted")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save draft" })).toBeNull();
    expect(within(screen.getByRole("heading", { level: 1 }).parentElement!.parentElement!).getByRole("link", { name: "Download PDF" })).toBeInTheDocument();
  });

  it("no Block button for a blocked customer or an owner", async () => {
    const c = disputeCase();
    c.customer.blockedAt = "2026-10-02T00:00:00Z";
    m.getDisputeCase.mockResolvedValue(c);
    render(await DisputePage(props()));
    expect(screen.queryByRole("button", { name: "Block customer…" })).toBeNull();
    expect(screen.getByText("Blocked")).toBeInTheDocument();
  });
});
