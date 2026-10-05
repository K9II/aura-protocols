import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
vi.mock("@/app/admin/catalog/actions", () => ({ correctCountAction: vi.fn(async () => null) }));
import CorrectCountDialog from "@/components/admin/catalog/CorrectCountDialog";

// jsdom has no showModal; open = attribute is enough for these tests.
HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };

describe("CorrectCountDialog", () => {
  it("previews left → left after the change", () => {
    render(<CorrectCountDialog lotId="l1" lotNumber="SS10-2609-01" left={38} held={3} sold={159} />);
    fireEvent.click(screen.getByRole("button", { name: "Correct count" }));
    fireEvent.change(screen.getByLabelText("Vials"), { target: { value: "3" } });
    expect(screen.getByText("35")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove 3 vials" })).toBeEnabled();
  });

  it("Owner withdrawal forces Remove and makes the note required", () => {
    render(<CorrectCountDialog lotId="l2" lotNumber="BPC-2610-03" left={10} held={0} sold={0} />);
    fireEvent.click(screen.getByRole("button", { name: "Correct count" }));
    fireEvent.click(screen.getByRole("button", { name: "Add vials" }));
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "owner_withdrawal" } });
    expect(screen.getByRole("button", { name: "Add vials" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Remove vials" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText(/Note/)).toBeRequired();
  });
});
