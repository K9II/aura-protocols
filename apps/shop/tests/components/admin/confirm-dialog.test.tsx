import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

describe("ConfirmDialog", () => {
  it("renders the trigger and a form with the hidden fields", () => {
    const action = vi.fn(async () => {});
    const { container } = render(<ConfirmDialog label="Suspend" title="Suspend QUINN10?" confirmLabel="Suspend" tone="danger" action={action} fields={{ partnerId: "p1", to: "suspended" }}>Code and link stop working now.</ConfirmDialog>);
    expect(screen.getAllByRole("button", { name: "Suspend", hidden: true })[0]).toHaveClass("a-btn", "danger");
    expect(container.querySelector('input[name="partnerId"]')).toHaveValue("p1");
    expect(container.querySelector('input[name="to"]')).toHaveValue("suspended");
    expect(screen.getByText("Code and link stop working now.")).toBeInTheDocument();
  });
});
