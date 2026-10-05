import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
vi.mock("@/app/admin/catalog/actions", () => ({ setFieldAction: vi.fn(async () => null) }));
import InlineField from "@/components/admin/catalog/InlineField";

describe("InlineField", () => {
  it("shows the value, edits on the pencil, submits the new value", () => {
    render(<InlineField slug="ss-31" variantId="50mg" field="price" display="$109.00" initial="109.00" label="Price per vial" />);
    expect(screen.getByText("$109.00")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit Price per vial" }));
    expect(screen.getByRole("textbox", { name: "Price per vial" })).toHaveValue("109.00");
  });
});
