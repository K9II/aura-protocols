import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Disclaimer from "@/components/Disclaimer";
import { DISCLAIMER } from "@/lib/constants";

describe("Disclaimer", () => {
  it("renders the exact disclaimer string from constants", () => {
    render(<Disclaimer />);
    expect(screen.getByText(DISCLAIMER)).toBeInTheDocument();
  });

  it("uses an aside role so screen readers can skip it", () => {
    render(<Disclaimer />);
    expect(screen.getByRole("note")).toBeInTheDocument();
  });
});
