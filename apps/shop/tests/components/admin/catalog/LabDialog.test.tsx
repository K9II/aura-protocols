import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
vi.mock("@/app/admin/catalog/settings/actions", () => ({ saveLabAction: vi.fn(async () => null) }));
import LabDialog from "@/components/admin/catalog/LabDialog";
import { saveLabAction } from "@/app/admin/catalog/settings/actions";

// jsdom has no showModal/close; a no-op close is enough for these tests.
HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };

describe("LabDialog", () => {
  it("pre-fills name and city and uses the given button label", () => {
    render(<LabDialog initial={{ name: "Kestrel Analytical", city: "Austin, TX" }} triggerLabel="Add lab" />);
    expect(screen.getByRole("button", { name: /add lab/i })).toBeInTheDocument();
    expect((screen.getByLabelText("Name", { selector: "input" }) as HTMLInputElement).value).toBe("Kestrel Analytical");
    expect((screen.getByLabelText(/City/, { selector: "input" }) as HTMLInputElement).value).toBe("Austin, TX");
  });
  it("portal: the dialog renders under body, not inside the caller's form", () => {
    const { container } = render(<form data-testid="outer"><LabDialog portal initial={{ name: "K", city: "" }} /></form>);
    expect(container.querySelector("dialog")).toBeNull();
    expect(document.body.querySelector("dialog")).not.toBeNull();
  });
  it("two pre-filled dialogs on one page don't collide on element ids", () => {
    render(
      <>
        <LabDialog portal initial={{ name: "Kestrel Analytical", city: "Austin, TX" }} />
        <LabDialog portal initial={{ name: "Oakridge Labs", city: "" }} />
      </>,
    );
    const ids = Array.from(document.body.querySelectorAll("[id]")).map((el) => el.id);
    expect(ids.length).toBe(new Set(ids).size);
  });
  it("calls onSaved with the saved name from the action's result, not the live field", async () => {
    (saveLabAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: "Lab added.", name: "Kestrel Analytical" });
    const onSaved = vi.fn();
    const { container } = render(<LabDialog initial={{ name: "Kestrel Analytical", city: "" }} onSaved={onSaved} />);
    await act(async () => { fireEvent.submit(container.querySelector("form")!); });
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledWith("Kestrel Analytical");
  });
});
