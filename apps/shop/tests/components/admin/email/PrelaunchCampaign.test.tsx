import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/app/admin/email/actions", () => ({ sendTestAction: vi.fn(), setOpeningDateAction: vi.fn(), sendNowAction: vi.fn() }));
import PrelaunchCampaign from "@/components/admin/email/PrelaunchCampaign";
import type { CampaignRow } from "@/lib/email/campaigns/data";

const counts = { all: 9, ordered: 0, never_ordered: 9, waitlist: 214, waitlist_never_ordered: 214 };
const empty = { headline: "", body: "", buttonLabel: "", buttonPath: "" };
const early = {
  id: "0b6f1c2e-1111-4222-8333-944455556666", kind: "early_access", status: "draft", name: "Pre-launch · Early access", subject: "Your early access is open",
  preview_text: "", content: empty, audience: "waitlist", updated_at: "2026-11-29T12:00:00Z", lots_snapshot: [], discount_code_id: null,
} as unknown as CampaignRow & { kind: "early_access" };
const props = { counts, site: "https://auraprotocols.com", mailingAddress: "Sheridan, WY", lastTest: null, canSend: true };
const sendBtn = () => screen.getByRole("button", { name: /Send now/ });

describe("PrelaunchCampaign: early access", () => {
  it("without a date: the date box, no preview, nothing can be sent", () => {
    render(<PrelaunchCampaign c={early} {...props} earlyPriceCents={17500} />);
    expect(screen.getByLabelText("Opening date")).toBeInTheDocument();
    expect(screen.getByText("Type the opening date to see the email.")).toBeInTheDocument();
    expect(sendBtn()).toBeDisabled();
    expect(screen.getByRole("button", { name: /Send test/ })).toBeDisabled();
  });

  it("with a date: the preview names it, and the send dialog warns about payments", () => {
    const { container } = render(<PrelaunchCampaign c={{ ...early, content: { ...empty, openingOn: "2026-12-01" } }} {...props} earlyPriceCents={17500} />);
    expect(sendBtn()).toBeEnabled();
    const doc = container.querySelector("iframe")?.getAttribute("srcdoc") ?? "";
    expect(doc).toContain("Tuesday, December 1");
    expect(doc).toContain("EARLY-XXXXXX");
    expect(doc).toContain("$131.25");
    expect(screen.getByText(/Checkout must take payments before you send this: the link lets 214 people order a day early/)).toBeInTheDocument();
  });

  it("no live GLOW price: says so, no preview, nothing can be sent", () => {
    const { container } = render(<PrelaunchCampaign c={{ ...early, content: { ...empty, openingOn: "2026-12-01" } }} {...props} earlyPriceCents={null} />);
    expect(screen.getByRole("alert").textContent).toMatch(/GLOW 70 mg has no live price/);
    expect(container.querySelector("iframe")).toBeNull();
    expect(sendBtn()).toBeDisabled();
  });

  it("another pre-launch email has no date box and no warning", () => {
    render(<PrelaunchCampaign c={{ ...early, kind: "first_look", subject: "A first look at the vials" } as never} {...props} />);
    expect(screen.queryByLabelText("Opening date")).toBeNull();
    expect(screen.queryByText(/Checkout must take payments/)).toBeNull();
    expect(sendBtn()).toBeEnabled();
  });
});
