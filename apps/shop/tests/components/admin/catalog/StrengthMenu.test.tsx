import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
vi.mock("@/app/admin/catalog/actions", () => ({ setStrengthShownAction: vi.fn(), archiveStrengthAction: vi.fn(), deleteStrengthAction: vi.fn(async () => null) }));
import StrengthMenu from "@/components/admin/catalog/StrengthMenu";

describe("StrengthMenu", () => {
  const props = { slug: "ss-31", variantId: "10mg", strength: "10 mg", shown: true, canDelete: false };

  it("opens from a labelled button with aria-expanded; closes on Escape and returns focus", () => {
    render(<StrengthMenu {...props} />);
    const btn = screen.getByRole("button", { name: "More for 10 mg" });
    expect(btn).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /Hide from store/ })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(btn).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: /Hide from store/ })).not.toBeInTheDocument();
    expect(btn).toHaveFocus();
  });

  it("closes on an outside click", () => {
    render(<div><StrengthMenu {...props} /><p>outside</p></div>);
    fireEvent.click(screen.getByRole("button", { name: "More for 10 mg" }));
    fireEvent.mouseDown(screen.getByText("outside"));
    expect(screen.queryByRole("button", { name: /Archive strength/ })).not.toBeInTheDocument();
  });

  it("hidden strength offers Show on store; the form sends shown=true", () => {
    render(<StrengthMenu {...props} shown={false} />);
    fireEvent.click(screen.getByRole("button", { name: "More for 10 mg" }));
    const show = screen.getByRole("button", { name: /Show on store/ });
    expect(show.closest("form")!.querySelector("input[name=shown]")).toHaveValue("true");
  });

  it("Delete is disabled with the reason when the strength has lots or orders", () => {
    render(<StrengthMenu {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "More for 10 mg" }));
    const del = screen.getByRole("button", { name: /Delete strength/ });
    expect(del).toBeDisabled();
    expect(del).toHaveTextContent("This one has lots or orders, so archive it instead.");
  });

  it("Archive and Delete ask first", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<StrengthMenu {...props} canDelete />);
    fireEvent.click(screen.getByRole("button", { name: "More for 10 mg" }));
    fireEvent.click(screen.getByRole("button", { name: /Archive strength/ }));
    expect(confirm).toHaveBeenLastCalledWith(expect.stringMatching(/^Archive 10 mg\?/));
    fireEvent.click(screen.getByRole("button", { name: /Delete strength/ }));
    expect(confirm).toHaveBeenLastCalledWith(expect.stringMatching(/^Delete 10 mg\?.*can't be undone/));
    confirm.mockRestore();
  });
  it("closes on submit", () => {
    render(<StrengthMenu {...props} />);
    const btn = screen.getByRole("button", { name: "More for 10 mg" });
    fireEvent.click(btn);
    fireEvent.submit(screen.getByRole("button", { name: /Hide from store/ }).closest("form")!);
    expect(btn).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: /Hide from store/ })).not.toBeInTheDocument();
  });
});
