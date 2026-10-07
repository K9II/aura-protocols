import { describe, it, expect, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

// jsdom doesn't implement <dialog>'s close()/showModal(); the component calls
// close() once the form action resolves.
if (!HTMLDialogElement.prototype.close) HTMLDialogElement.prototype.close = function close() {};
if (!HTMLDialogElement.prototype.showModal) HTMLDialogElement.prototype.showModal = function showModal() {};

describe("ConfirmDialog", () => {
  it("renders the trigger and a form with the hidden fields", () => {
    const action = vi.fn(async () => {});
    const { container } = render(<ConfirmDialog label="Suspend" title="Suspend QUINN10?" confirmLabel="Suspend" tone="danger" action={action} fields={{ partnerId: "p1", to: "suspended" }}>Code and link stop working now.</ConfirmDialog>);
    expect(screen.getAllByRole("button", { name: "Suspend", hidden: true })[0]).toHaveClass("a-btn", "danger");
    expect(container.querySelector('input[name="partnerId"]')).toHaveValue("p1");
    expect(container.querySelector('input[name="to"]')).toHaveValue("suspended");
    expect(screen.getByText("Code and link stop working now.")).toBeInTheDocument();
  });

  it("submitting calls the action with the hidden fields", async () => {
    const action = vi.fn(async (_form: FormData) => {});
    const { container } = render(<ConfirmDialog label="Suspend" title="Suspend QUINN10?" confirmLabel="Suspend" tone="danger" action={action} fields={{ partnerId: "p1", to: "suspended" }}>Code and link stop working now.</ConfirmDialog>);
    await act(async () => { fireEvent.submit(container.querySelector("form")!); });
    expect(action).toHaveBeenCalled();
    const fd = action.mock.calls[0][0] as FormData;
    expect(fd.get("partnerId")).toBe("p1");
    expect(fd.get("to")).toBe("suspended");
  });
});
