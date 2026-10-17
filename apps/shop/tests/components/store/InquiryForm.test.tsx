import { describe, it, expect, vi } from "vitest";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import InquiryForm from "@/components/store/InquiryForm";

describe("InquiryForm prefill", () => {
  it("fills the message from its page event and leaves sending to the buyer", () => {
    render(<InquiryForm topic="wholesale" orgLabel="Organization" messageLabel="Compounds, strengths and kits" prefillEvent="aura:volume-quote" />);
    act(() => { window.dispatchEvent(new CustomEvent("aura:volume-quote", { detail: "Volume quote request (50 kits):\n- BPC-157 10 mg: 50 kits" })); });
    const box = screen.getByLabelText("Compounds, strengths and kits") as HTMLTextAreaElement;
    expect(box.value).toBe("Volume quote request (50 kits):\n- BPC-157 10 mg: 50 kits");
    expect(document.activeElement).toBe(box);
    expect(screen.getByRole("button", { name: "Send →" })).toBeTruthy();
  });

  it("ignores the event when it has no prefill event, and non-text details", () => {
    render(<InquiryForm topic="other" orgLabel="Organization" messageLabel="Message" />);
    act(() => { window.dispatchEvent(new CustomEvent("aura:volume-quote", { detail: "x" })); });
    expect((screen.getByLabelText("Message") as HTMLTextAreaElement).value).toBe("");
  });

  it("shows the message placeholder it is given", () => {
    render(<InquiryForm topic="wholesale" orgLabel="Organization" messageLabel="Kits" messagePlaceholder="One line per strength" />);
    expect((screen.getByLabelText("Kits") as HTMLTextAreaElement).placeholder).toBe("One line per strength");
  });

  it("announces a successful send on its sent event (ref, name, message)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ref: "Q-1007" }), { status: 200 })));
    const seen: unknown[] = [];
    const on = (e: Event) => seen.push((e as CustomEvent).detail);
    window.addEventListener("aura:volume-quote-sent", on);
    render(<InquiryForm topic="wholesale" orgLabel="Organization" messageLabel="Kits" sentEvent="aura:volume-quote-sent" />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Dana Reyes" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "d@lab.org" } });
    fireEvent.change(screen.getByLabelText("Kits"), { target: { value: "Volume quote request (50 kits)" } });
    fireEvent.click(screen.getByRole("button", { name: "Send →" }));
    await waitFor(() => expect(seen).toEqual([{ ref: "Q-1007", name: "Dana Reyes", message: "Volume quote request (50 kits)" }]));
    window.removeEventListener("aura:volume-quote-sent", on);
    vi.unstubAllGlobals();
  });
});
