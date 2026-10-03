import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Animations; jsdom has no canvas or matchMedia.
vi.mock("@/components/BiosignatureSphere", () => ({ default: () => null }));
vi.mock("@/components/ScrollReveal", () => ({ default: () => null }));

import HomePage from "@/app/page";

describe("/ (home)", () => {
  it("links the lineup heading to the full inventory", () => {
    render(<HomePage />);
    const heading = screen.getByRole("heading", { level: 2, name: /the lineup/i });
    const link = heading.querySelector("a");
    expect(link).not.toBeNull();
    expect(link!.getAttribute("href")).toBe("/products");
  });
});
