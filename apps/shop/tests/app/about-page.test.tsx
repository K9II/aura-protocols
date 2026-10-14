import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AboutPage from "@/app/about/page";
import { PURITY_FLOOR_PCT, SUPPORT_EMAIL } from "@/lib/constants";

describe("/about (About + Quality Standards)", () => {
  it("has the five sections, with testing under #testing for the old /quality-standards link", () => {
    render(<AboutPage />);
    for (const h of ["Why we started", "Since 1906", "How a lot is tested", "Checking a vial", "Research use only"]) {
      expect(screen.getByRole("heading", { level: 2, name: h })).toBeInTheDocument();
    }
    expect(screen.getByRole("heading", { level: 2, name: "How a lot is tested" }).closest("section")).toHaveAttribute("id", "testing");
  });

  it("says US-based laboratory and never claims accreditation (owner, 2026-10-14)", () => {
    const { container } = render(<AboutPage />);
    const text = container.textContent ?? "";
    expect(text).toContain("independent US-based laboratory");
    expect(text).not.toMatch(/17025|accredited/i);
    expect(text).not.toMatch(/COA pending/i);
  });

  it("takes the purity floor and support address from constants, and links the lookup and RUO policy", () => {
    const { container } = render(<AboutPage />);
    expect(container.textContent).toContain(`floor of ${PURITY_FLOOR_PCT}%`);
    expect(screen.getByRole("link", { name: SUPPORT_EMAIL })).toHaveAttribute("href", `mailto:${SUPPORT_EMAIL}`);
    expect(screen.getByRole("link", { name: "COA Lookup" })).toHaveAttribute("href", "/coa");
    expect(screen.getByRole("link", { name: "Research Use Only policy" })).toHaveAttribute("href", "/ruo");
  });
});
