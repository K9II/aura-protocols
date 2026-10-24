import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SoonRibbon from "@/components/store/coming-soon/SoonRibbon";

describe("SoonRibbon", () => {
  it("says the store isn't open yet and links to the waitlist form", () => {
    render(<SoonRibbon />);
    const note = screen.getByRole("note", { name: "Coming soon" });
    expect(note).toHaveTextContent("Coming soon");
    expect(note).toHaveTextContent("The store isn't open yet.");
    expect(screen.getByRole("link", { name: /Join the waitlist/ })).toHaveAttribute("href", "#join");
  });

  it("names no date (the opening date is tentative)", () => {
    const { container } = render(<SoonRibbon />);
    expect(container.textContent).not.toMatch(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.? \d/);
    expect(container.textContent).not.toMatch(/\d{1,2}\/\d{1,2}/);
  });
});
