import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WARNING_ID } from "../../helpers/dispute-fixtures";
vi.mock("@/app/admin/disputes/actions", () => ({
  saveDisputeDraftAction: vi.fn(async () => null), submitDisputeAction: vi.fn(async () => null),
  refundEarlyWarningAction: vi.fn(async () => null), watchEarlyWarningAction: vi.fn(async () => undefined),
}));
import WarningAction from "@/components/admin/disputes/WarningAction";

// jsdom has no showModal; the open attribute is enough here.
HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };

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
