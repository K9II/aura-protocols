import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FaqPage from "@/app/faq/page";

describe("/faq", () => {
  it("carries the four answers moved off the home page", () => {
    render(<FaqPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Straight answers.");
    for (const q of [/human use/i, /what's a coa/i, /how fast do you ship/i, /coa pending/i]) {
      expect(screen.getByRole("heading", { level: 2, name: q })).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: "COA Lookup" })).toHaveAttribute("href", "/coa");
  });
});
