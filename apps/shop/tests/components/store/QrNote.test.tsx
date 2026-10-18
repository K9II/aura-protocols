import { describe, it, expect } from "vitest";
import { act, render, screen } from "@testing-library/react";
import QrNote from "@/components/store/QrNote";
import { VIAL_QR_EVENT } from "@/components/store/VialTurn";

const say = (slug: string, showing: boolean) => act(() => { window.dispatchEvent(new CustomEvent(VIAL_QR_EVENT, { detail: { slug, showing } })); });

describe("QrNote", () => {
  it("lights up while this product's vial holds on its QR code", () => {
    render(<QrNote slug="ss-31" />);
    const note = screen.getByText(/every vial carries a qr code/i);
    expect(note).not.toHaveClass("is-lit");
    say("ss-31", true);
    expect(note).toHaveClass("is-lit");
    say("ss-31", false);
    expect(note).not.toHaveClass("is-lit");
  });

  it("ignores another product's vial", () => {
    render(<QrNote slug="ss-31" />);
    say("mots-c", true);
    expect(screen.getByText(/every vial carries a qr code/i)).not.toHaveClass("is-lit");
  });
});
