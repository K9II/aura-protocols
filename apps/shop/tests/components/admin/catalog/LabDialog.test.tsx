import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
vi.mock("@/app/admin/catalog/settings/actions", () => ({ saveLabAction: vi.fn() }));
import LabDialog from "@/components/admin/catalog/LabDialog";

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
});
