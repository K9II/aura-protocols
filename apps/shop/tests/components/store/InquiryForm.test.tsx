import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import InquiryForm from "@/components/store/InquiryForm";

const LINES = [{ slug: "bpc-157", variantId: "10mg", kits: 30 }];
const MSG = "Volume quote request (30 kits):\n- BPC-157 10 mg: 30 kits";
const fill = (detail: unknown) => act(() => { window.dispatchEvent(new CustomEvent("aura:volume-quote", { detail })); });
const bodyOf = (m: ReturnType<typeof vi.fn>) => JSON.parse((m.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);

describe("InquiryForm", () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it("fills the message from its page event (text, or text + kits) and leaves sending to the buyer", () => {
    render(<InquiryForm topic="wholesale" orgLabel="Organization" messageLabel="Compounds, strengths and kits" prefillEvent="aura:volume-quote" />);
    fill(MSG);
    const box = screen.getByLabelText("Compounds, strengths and kits") as HTMLTextAreaElement;
    expect(box.value).toBe(MSG);
    expect(document.activeElement).toBe(box);
    fill({ message: "Volume quote request (31 kits)", lines: LINES });
    expect(box.value).toBe("Volume quote request (31 kits)");
    expect(screen.getByRole("button", { name: "Send →" })).toBeTruthy();
  });

  it("ignores the event when it has no prefill event, and details that aren't text", () => {
    render(<InquiryForm topic="other" orgLabel="Organization" messageLabel="Message" prefillEvent="aura:volume-quote" />);
    fill(42);
    fill({ lines: LINES });
    expect((screen.getByLabelText("Message") as HTMLTextAreaElement).value).toBe("");
  });

  it("shows the message placeholder it is given", () => {
    render(<InquiryForm topic="wholesale" orgLabel="Organization" messageLabel="Kits" messagePlaceholder="One line per strength" />);
    expect((screen.getByLabelText("Kits") as HTMLTextAreaElement).placeholder).toBe("One line per strength");
  });

  it("a request sent as handed over carries its kits, and an order number opens that order's page", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true, ref: "Q-1009", orderNumber: "AP-1063" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    render(<InquiryForm topic="wholesale" orgLabel="Organization" messageLabel="Kits" prefillEvent="aura:volume-quote"
      signedIn={{ name: "Dana Reyes", email: "d@lab.org", organization: null }} />);
    fill({ message: MSG, lines: LINES });
    fireEvent.click(screen.getByRole("button", { name: "Send →" }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/order/AP-1063"));
    expect(bodyOf(fetchMock)).toMatchObject({ topic: "wholesale", message: MSG, quoteLines: LINES });
  });

  it("an edited request goes as a plain inquiry (no kits) and gets the thank-you line", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true, ref: "Q-1010", orderNumber: null }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<InquiryForm topic="wholesale" orgLabel="Organization" messageLabel="Kits" prefillEvent="aura:volume-quote"
      signedIn={{ name: "Dana Reyes", email: "d@lab.org", organization: null }} />);
    fill({ message: MSG, lines: LINES });
    fireEvent.change(screen.getByLabelText("Kits"), { target: { value: `${MSG}\nAlso a custom compound` } });
    fireEvent.click(screen.getByRole("button", { name: "Send →" }));
    await screen.findByText(/your message is/);
    expect(screen.getByRole("status").textContent).toContain("Q-1010");
    expect(screen.getByRole("status").textContent).toContain("within one business day");
    expect(bodyOf(fetchMock).quoteLines).toBeUndefined();
  });

  it("signed in: shows who is sending instead of name/email fields, starts the organization from the account, sends no name/email", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ref: "Q-1009" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<InquiryForm topic="wholesale" orgLabel="Organization" messageLabel="Kits"
      signedIn={{ name: "Dana Reyes", email: "d@lab.org", organization: "Reyes Lab" }} />);
    expect(screen.getByText(/Signed in as/).textContent).toBe("Signed in as Dana Reyes · d@lab.org");
    expect(screen.queryByLabelText("Name")).toBeNull();
    expect(screen.queryByLabelText("Email")).toBeNull();
    expect((screen.getByLabelText("Organization") as HTMLInputElement).value).toBe("Reyes Lab");
    fireEvent.change(screen.getByLabelText("Kits"), { target: { value: "BPC-157 10 mg: 50 kits" } });
    fireEvent.click(screen.getByRole("button", { name: "Send →" }));
    await screen.findByRole("status");
    const body = bodyOf(fetchMock);
    expect(body).toMatchObject({ topic: "wholesale", organization: "Reyes Lab", message: "BPC-157 10 mg: 50 kits" });
    expect(body.name).toBeUndefined();
    expect(body.email).toBeUndefined();
  });
});
