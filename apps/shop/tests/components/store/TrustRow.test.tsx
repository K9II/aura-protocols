import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TrustRow from "@/components/store/TrustRow";
import { FREE_SHIPPING_THRESHOLD_USD } from "@/lib/cart";
import { PURITY_FLOOR_PCT } from "@/lib/constants";

describe("TrustRow", () => {
  it("shows the four claims with figures from the constants", () => {
    render(<TrustRow />);
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByText("Ships from the USA")).toBeInTheDocument();
    expect(screen.getByText(`Tracked · free over $${FREE_SHIPPING_THRESHOLD_USD}`)).toBeInTheDocument();
    expect(screen.getByText(`≥${PURITY_FLOOR_PCT}% purity floor`)).toBeInTheDocument();
    expect(screen.getByText("Independent US lab")).toBeInTheDocument();
    expect(screen.getByText("Certificate every lot")).toBeInTheDocument();
  });

  it("never names a city or promises delivery days", () => {
    const { container } = render(<TrustRow />);
    expect(container.textContent).not.toMatch(/gilbert|arizona|\b\d+[- ]day\b/i);
  });
});
