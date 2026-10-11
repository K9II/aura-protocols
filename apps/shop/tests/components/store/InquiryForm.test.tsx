import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
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
});
