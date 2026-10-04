import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/app/admin/discounts/actions", () => ({ saveCodeAction: vi.fn(), codeAvailableAction: vi.fn().mockResolvedValue({ ok: true, message: "SPRING20 is available" }) }));

describe("DiscountForm", () => {
  it("writes the live summary from the fields", async () => {
    const { default: DiscountForm } = await import("@/components/admin/discounts/DiscountForm");
    render(<DiscountForm mode="single" capPct={30} />);
    fireEvent.change(screen.getByLabelText("Code"), { target: { value: "SPRING20" } });
    fireEvent.click(screen.getByRole("radio", { name: /Order %/ }));
    fireEvent.change(screen.getByLabelText("Percent off"), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("switch", { name: /Stack on top/ }));
    expect(screen.getByTestId("rule-summary")).toHaveTextContent("SPRING20 takes 20% off the goods total after pack, new-account and partner discounts.");
  });

  it("shows the worst-case basket and warns when the cap trims it", async () => {
    const { default: DiscountForm } = await import("@/components/admin/discounts/DiscountForm");
    render(<DiscountForm mode="single" capPct={30} />);
    fireEvent.click(screen.getByRole("radio", { name: /Order %/ }));
    fireEvent.change(screen.getByLabelText("Percent off"), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("switch", { name: /Stack on top/ }));
    expect(screen.getByTestId("worst-case")).toHaveTextContent(/30% off list/);
    expect(screen.getByRole("note")).toHaveTextContent(/30% cap trims it/);
  });

  it("batch mode swaps the code field for prefix and count", async () => {
    const { default: DiscountForm } = await import("@/components/admin/discounts/DiscountForm");
    render(<DiscountForm mode="batch" capPct={30} />);
    expect(screen.queryByLabelText("Code")).toBeNull();
    expect(screen.getByLabelText("Prefix")).toBeInTheDocument();
    expect(screen.getByLabelText("How many")).toBeInTheDocument();
  });
});
