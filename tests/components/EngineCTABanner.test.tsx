import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import EngineCTABanner from "@/components/EngineCTABanner";
import { ENGINE_URL } from "@/lib/constants";

describe("EngineCTABanner", () => {
  it("renders a link pointing at the Engine with safe rel + new tab", () => {
    render(<EngineCTABanner />);
    const link = screen.getByRole("link", { name: /open the engine/i });
    expect(link).toHaveAttribute("href", ENGINE_URL);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toMatch(/noopener/);
    expect(link.getAttribute("rel")).toMatch(/noreferrer/);
  });

  it("is dismissable and stays dismissed via localStorage", async () => {
    const { rerender } = render(<EngineCTABanner />);
    screen.getByRole("button", { name: /dismiss/i }).click();
    rerender(<EngineCTABanner />);
    expect(screen.queryByRole("link", { name: /open the engine/i })).toBeNull();
  });
});
