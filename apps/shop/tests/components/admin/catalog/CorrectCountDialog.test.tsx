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
});
