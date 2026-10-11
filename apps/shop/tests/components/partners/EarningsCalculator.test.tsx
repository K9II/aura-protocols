import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import EarningsCalculator from "@/components/partners/EarningsCalculator";

describe("EarningsCalculator", () => {
  it("opens on the approved example: 20 orders at $180", () => {
    render(<EarningsCalculator />);
    expect(screen.getByTestId("calc-first")).toHaveTextContent("$360");
    expect(screen.getByTestId("calc-year")).toHaveTextContent("$8,100");
    expect(screen.getByTestId("calc-tier")).toHaveTextContent("20%");
    expect(screen.getByTestId("calc-when")).toHaveTextContent("15% from month 2 · 20% from month 3");
    expect(screen.getByText(/illustration only/i)).toBeInTheDocument();
  });

  it("switches to store credit at 1.3×", () => {
    render(<EarningsCalculator />);
    fireEvent.click(screen.getByRole("button", { name: /store credit/i }));
    expect(screen.getByTestId("calc-first")).toHaveTextContent("$468");
    expect(screen.getByTestId("calc-year")).toHaveTextContent("$10,530");
  });

  it("recalculates from the sliders", () => {
    render(<EarningsCalculator />);
    fireEvent.change(screen.getByLabelText(/orders you refer per month/i), { target: { value: "100" } });
    fireEvent.change(screen.getByLabelText(/average order/i), { target: { value: "200" } });
    expect(screen.getByTestId("calc-first")).toHaveTextContent("$2,000");
    expect(screen.getByTestId("calc-year")).toHaveTextContent("$46,000");
    expect(screen.getByTestId("calc-when")).toHaveTextContent(/^20% from month 2$/);
    fireEvent.change(screen.getByLabelText(/orders you refer per month/i), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText(/average order/i), { target: { value: "180" } });
    expect(screen.getByTestId("calc-when")).toHaveTextContent("15% from month 6 · 20% from month 8");
  });
});
