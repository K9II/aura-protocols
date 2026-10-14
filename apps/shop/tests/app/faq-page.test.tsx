import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FaqPage from "@/app/faq/page";

describe("/faq", () => {
  it("carries the answers moved off the home page, without COA pending (nothing is listed before it passes)", () => {
    render(<FaqPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Straight answers.");
    for (const q of [/human use/i, /what's a coa/i, /how fast do you ship/i]) {
      expect(screen.getByRole("heading", { level: 2, name: q })).toBeInTheDocument();
    }
    expect(screen.queryByRole("heading", { level: 2, name: /coa pending/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "COA Lookup" })).toHaveAttribute("href", "/coa");
  });
});
