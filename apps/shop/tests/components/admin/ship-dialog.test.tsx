import { describe, it, expect, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

const markShippedAction = vi.hoisted(() => vi.fn());
vi.mock("@/app/admin/orders/actions", () => ({ markShippedAction }));
import ShipDialog from "@/components/admin/orders/ShipDialog";

describe("ShipDialog", () => {
  it("renders the trigger, carrier choices and the tracking field", () => {
    render(<ShipDialog orderId="o1" orderNumber="AP-1033" summary="Marcus Lee · Austin, TX · 5 vials" />);
    expect(screen.getByRole("button", { name: "Ship" })).toBeInTheDocument();
    expect(screen.getByLabelText("Tracking number")).toHaveAttribute("name", "tracking");
    expect(screen.getByLabelText("Carrier")).toHaveDisplayValue("USPS");
    expect(screen.getByText(/Marcus Lee · Austin, TX · 5 vials/)).toBeInTheDocument();
  });

  it("shows the action's tracking error under the field", async () => {
    markShippedAction.mockResolvedValue({ error: "Use 8–40 letters and numbers.", field: "tracking" });
    const { container } = render(<ShipDialog orderId="o1" orderNumber="AP-1033" summary="x" />);
    await act(async () => { fireEvent.submit(container.querySelector("form")!); });
    expect(await screen.findByText("Use 8–40 letters and numbers.")).toBeInTheDocument();
    expect(markShippedAction).toHaveBeenCalled();
  });
});
