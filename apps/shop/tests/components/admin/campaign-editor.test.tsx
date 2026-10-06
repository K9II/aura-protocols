import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
vi.mock("@/app/admin/email/actions", () => ({ saveCampaignAction: vi.fn(), sendTestAction: vi.fn(), scheduleAction: vi.fn(), sendNowAction: vi.fn() }));
import CampaignEditor from "@/components/admin/email/CampaignEditor";
import { saveCampaignAction } from "@/app/admin/email/actions";

const base = {
  campaign: null, kind: "promotion" as const, lotChoices: [], codes: [{ id: "c1", label: "OCT10 · 10% off items · Oct 8 – Oct 12 · 500 uses" }],
  audienceCounts: { all: 2310, ordered: 486, never_ordered: 1824 }, checks: [], site: "https://auraprotocols.com", mailingAddress: "Aura Protocols LLC · 1 A St", codeRender: {},
};

describe("CampaignEditor", () => {
  it("new campaign: type is choosable, Send/Schedule wait for the first save", () => {
    render(<CampaignEditor {...base} />);
    expect(screen.getByRole("link", { name: /Research news/ })).toHaveAttribute("href", "/admin/email/campaigns/new?kind=news");
    expect(screen.getByRole("button", { name: /Send now/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Schedule/ })).toBeDisabled();
    expect(screen.getByText("Save to run the checks")).toBeInTheDocument();
  });

  it("the preview updates as you type (headline accent, preview text)", () => {
    render(<CampaignEditor {...base} />);
    fireEvent.change(screen.getByLabelText("Headline"), { target: { value: "Restocked and *certified.*" } });
    const frame = screen.getByTitle("Email preview") as HTMLIFrameElement;
    expect(frame.getAttribute("srcdoc")).toContain('<em style="color:#A32B1F">certified.</em>');
  });

  it("audience shows live counts", () => {
    render(<CampaignEditor {...base} />);
    expect(screen.getByText("2,310 people")).toBeInTheDocument();
    expect(screen.getByText("1,824 people")).toBeInTheDocument();
  });

  it("blocking checks disable sending and are listed", () => {
    const campaign = { id: "k1", kind: "promotion", status: "draft", name: "N", subject: "S", preview_text: "", content: { headline: "H", body: "your stack", buttonLabel: "", buttonPath: "" }, audience: "all", discount_code_id: "c1", lots_snapshot: [] };
    render(<CampaignEditor {...base} campaign={campaign as never} checks={[{ level: "block", field: "body", text: 'Body: "stack" is a banned phrase. Fix it to send.' }]} />);
    expect(screen.getAllByText('Body: "stack" is a banned phrase. Fix it to send.').length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Send now/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Send test to me/ })).toBeEnabled();
  });

  it("editing marks the form unsaved and disables sending until saved", () => {
    const campaign = { id: "k1", kind: "news", status: "draft", name: "N", subject: "S", preview_text: "", content: { headline: "H", body: "", buttonLabel: "", buttonPath: "" }, audience: "all", discount_code_id: null, lots_snapshot: [] };
    render(<CampaignEditor {...base} kind="news" campaign={campaign as never} checks={[{ level: "ok", text: "Compliance scan passed: subject, headline, body and button." }]} />);
    expect(screen.getByRole("button", { name: /Send now/ })).toBeEnabled();
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "New" } });
    expect(screen.getByRole("button", { name: /Send now/ })).toBeDisabled();
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
  });

  it("a successful save resets 'dirty' — Send now / Schedule / Send test re-enable without a reload", async () => {
    const campaign = { id: "k1", kind: "news", status: "draft", name: "N", subject: "S", preview_text: "", content: { headline: "H", body: "", buttonLabel: "", buttonPath: "" }, audience: "all", discount_code_id: null, lots_snapshot: [] };
    vi.mocked(saveCampaignAction).mockResolvedValue({ ok: "Saved.", checks: [{ level: "ok", text: "Compliance scan passed: subject, headline, body and button." }] });
    const { container } = render(<CampaignEditor {...base} kind="news" campaign={campaign as never} checks={[{ level: "ok", text: "Compliance scan passed: subject, headline, body and button." }]} />);
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "New" } });
    expect(screen.getByRole("button", { name: /Send now/ })).toBeDisabled();
    await act(async () => { fireEvent.submit(container.querySelector("#campaign-form")!); });
    expect(screen.getByRole("button", { name: /Send now/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Schedule/ })).toBeEnabled();
    expect(screen.getByText("All changes saved")).toBeInTheDocument();
  });

  it("both the desktop and phone Send dialogs submit the real campaign id, never a suffixed one", () => {
    const campaign = { id: "k1", kind: "news", status: "draft", name: "N", subject: "S", preview_text: "", content: { headline: "H", body: "", buttonLabel: "", buttonPath: "" }, audience: "all", discount_code_id: null, lots_snapshot: [] };
    const { container } = render(<CampaignEditor {...base} kind="news" campaign={campaign as never} checks={[{ level: "ok", text: "Compliance scan passed: subject, headline, body and button." }]} />);
    const dialogs = [...container.querySelectorAll('dialog[aria-labelledby^="send-"]')];
    // desktop (.a-savebar) + phone (.a-psticky) Send dialogs, both present and enabled since the draft is saved and clean.
    expect(dialogs.length).toBe(2);
    const ids = dialogs.map((d) => d.querySelector<HTMLInputElement>('input[name="id"]')!.value);
    expect(ids).toEqual(["k1", "k1"]);
    // Distinct DOM ids (dialogKey), so the two don't collide on the page.
    expect(new Set(dialogs.map((d) => d.getAttribute("aria-labelledby"))).size).toBe(2);
  });
});
