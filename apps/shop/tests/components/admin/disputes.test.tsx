import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WARNING_ID } from "../../helpers/dispute-fixtures";
vi.mock("@/app/admin/disputes/actions", () => ({
  saveDisputeDraftAction: vi.fn(async () => null), submitDisputeAction: vi.fn(async () => null),
  refundEarlyWarningAction: vi.fn(async () => null), watchEarlyWarningAction: vi.fn(async () => undefined),
}));
import WarningAction from "@/components/admin/disputes/WarningAction";
import EvidenceForm from "@/components/admin/disputes/EvidenceForm";

// jsdom has no showModal; the open attribute is enough here.
HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };

const initial = {
  uncategorized_text: "To the card issuer,", shipping_carrier: "USPS", shipping_tracking_number: "9400111899223401552788", shipping_date: "September 22, 2026",
  shipping_address: "Dana Whitfield, 1420 Elm St, Boulder, CO 80302", customer_name: "Dana Whitfield", customer_email_address: "dana.w@example.com",
  product_description: "Research chemicals for laboratory research use only.",
};

describe("EvidenceForm", () => {
  it("one form: Save draft submits it; Submit opens the confirm dialog inside the same form (no nested form)", () => {
    const { container } = render(<EvidenceForm id="d1" initial={initial} letterFor="not received" scanOk agreement={[["Agreed", "September 14, 2026"]]}
      policy="Agreed at sign-up." savedText="Not saved yet · the bank sees nothing until you submit" pdfHref="/admin/disputes/d1/evidence.pdf"
      summary={{ chargeback: "AP-1031 · not received · $412.00", shipping: "USPS · shipped Sep 22", pdfPages: 3 }} />);
    expect(container.querySelectorAll("form")).toHaveLength(1);
    expect(container.querySelector("form form")).toBeNull();
    expect(screen.getByRole("button", { name: "Save draft" })).toHaveAttribute("type", "submit");
    fireEvent.change(screen.getByRole("textbox", { name: "Cover letter" }), { target: { value: "To the card issuer, thank you." } });
    fireEvent.click(screen.getByRole("button", { name: "Submit to Stripe…" }));
    expect(screen.getByRole("heading", { name: "Submit evidence to Stripe?" })).toBeInTheDocument();
    expect(screen.getByText("30 characters")).toBeInTheDocument();
    expect(screen.getByText("Evidence PDF · 3 pages")).toBeInTheDocument();
    expect(screen.getByText(/can't be changed after it's submitted/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit evidence" }).closest("form")).toBe(container.querySelector("form"));
  });
});

describe("WarningAction", () => {
  it("not shipped: Cancel and refund dialog with the amount back to the card", () => {
    render(<WarningAction w={{ id: WARNING_ID, orderNumber: "AP-1044", kind: "refund", chargedCents: 18450, creditCents: 0 }} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel and refund…" }));
    expect(screen.getByRole("heading", { name: "Cancel and refund AP-1044?" })).toBeInTheDocument();
    expect(screen.getByText("$184.50")).toBeInTheDocument();
    expect(screen.getByText("Refunding now avoids the $15.00 dispute fee and keeps this off your dispute rate.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel and refund" })).toHaveAttribute("type", "submit");
  });

  it("shipped: a Watch button; already refunded: Close", () => {
    const { rerender } = render(<WarningAction w={{ id: WARNING_ID, orderNumber: "AP-1029", kind: "watch", chargedCents: 9600, creditCents: 0 }} />);
    expect(screen.getByRole("button", { name: "Watch" })).toHaveAttribute("type", "submit");
    rerender(<WarningAction w={{ id: WARNING_ID, orderNumber: "AP-1029", kind: "close", chargedCents: 9600, creditCents: 0 }} />);
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });
});
