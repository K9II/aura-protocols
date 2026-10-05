import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
vi.mock("@/app/admin/customers/actions", () => ({ adjustCreditAction: vi.fn(async () => null), blockAction: vi.fn(async () => null) }));
import CreditDialog from "@/components/admin/customers/CreditDialog";
import BlockDialog from "@/components/admin/customers/BlockDialog";

// jsdom has no showModal; open = attribute is enough for these tests.
HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };

describe("CreditDialog", () => {
  it("previews the new balance and hides email for a removal", () => {
    render(<CreditDialog customerId="c1" balanceCents={12_000} />);
    fireEvent.click(screen.getByRole("button", { name: "Adjust credit" }));
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "50" } });
    expect(screen.getByText("$170.00")).toBeInTheDocument();
    expect(screen.getByLabelText("Email the customer")).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Remove credit" }));
    expect(screen.getByText("$70.00")).toBeInTheDocument();
    expect(screen.queryByLabelText("Email the customer")).toBeNull();
    expect(screen.getByRole("button", { name: "Remove $50.00" })).toBeInTheDocument();
  });
});

describe("BlockDialog", () => {
  it("lists the open checkouts it will cancel and requires a reason", () => {
    render(<BlockDialog customerId="c1" name="Chris Albright" openCheckouts={[{ number: "AP-1095", totalCents: 28_900 }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Block" }));
    expect(screen.getByRole("heading", { name: "Block Chris Albright?" })).toBeInTheDocument();
    expect(screen.getByText(/AP-1095/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Reason/)).toBeRequired();
  });
});
