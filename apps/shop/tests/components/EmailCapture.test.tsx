import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import EmailCapture from "@/components/EmailCapture";

describe("EmailCapture", () => {
  it("renders the native lead-magnet form, not an iframe", () => {
    const { container } = render(<EmailCapture />);
    expect(container.querySelector("iframe")).toBeNull();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/goal/i)).toBeInTheDocument();
  });
});
