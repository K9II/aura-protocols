import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
vi.mock("@/app/admin/catalog/actions", () => ({ addStrengthAction: vi.fn(async () => null) }));
import AddStrengthDialog from "@/components/admin/catalog/AddStrengthDialog";

HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };

describe("AddStrengthDialog", () => {
  const open = () => { render(<AddStrengthDialog slug="ss-31" title="SS-31" />); fireEvent.click(screen.getByRole("button", { name: "Add a strength" })); };

  it("has amount + unit (mg / mcg / IU), price, low level and an optional SKU; starts hidden", () => {
    open();
    expect(screen.getByText("Add a strength · SS-31")).toBeInTheDocument();
    expect(screen.getByLabelText("Strength")).toHaveAttribute("name", "amount");
    expect([...(screen.getByLabelText("Unit") as HTMLSelectElement).options].map((o) => o.value)).toEqual(["mg", "mcg", "IU"]);
    expect(screen.getByLabelText("Price per vial")).toHaveAttribute("name", "price");
    expect(screen.getByLabelText(/Low at/)).toHaveValue("20");
    expect(screen.getByLabelText(/3PL SKU/)).not.toBeRequired();
    expect(screen.getByText("Starts hidden")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add strength" })).toBeInTheDocument();
  });

  it("previews what customers see", () => {
    open();
    fireEvent.change(screen.getByLabelText("Strength"), { target: { value: "250" } });
    fireEvent.change(screen.getByLabelText("Unit"), { target: { value: "mcg" } });
    expect(screen.getByText(/Customers see “250 mcg”\. Unit: mg, mcg or IU\./)).toBeInTheDocument();
  });

  it("scopes field ids by product", () => {
    open();
    expect(screen.getByLabelText("Strength").id).toBe("as-amount-ss-31");
  });
});
