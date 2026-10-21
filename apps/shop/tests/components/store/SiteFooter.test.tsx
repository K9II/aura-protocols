import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import SiteFooter from "@/components/store/SiteFooter";
import { liveFixture } from "../../helpers/live-catalog";

describe("SiteFooter", () => {
  it("carries the research-and-identification disclaimer", () => {
    render(<SiteFooter catalog={liveFixture()} />);
    expect(screen.getByText(/All products sold on this website are intended for research and identification purposes only\. They are not intended for human or animal use of any kind, including ingestion\./)).toBeInTheDocument();
  });

  it("says up to a seven-point panel, never that every lot gets all seven (2026-10-20)", () => {
    render(<SiteFooter catalog={liveFixture()} />);
    expect(screen.getByText(/each lot put through up to a seven-point panel\. Testing includes ISO\/IEC 17025-accredited US lab\./)).toBeInTheDocument();
  });

  it("lists only All compounds and Blends under Shop", () => {
    render(<SiteFooter catalog={liveFixture()} />);
    const shop = screen.getByText("Shop").nextElementSibling as HTMLElement;
    const links = [...shop.querySelectorAll("a")].map((a) => [a.textContent, a.getAttribute("href")]);
    expect(links).toEqual([["All compounds", "/products"], ["Blends", "/products?cat=Blends"]]);
  });

  it("drops Blends when no blend is shown", () => {
    render(<SiteFooter catalog={liveFixture().filter((c) => c.chemicalClass !== "Blends")} />);
    expect(screen.queryByRole("link", { name: "Blends" })).not.toBeInTheDocument();
  });

  it("lists About and FAQ under Company; Quality Standards is part of About now", () => {
    render(<SiteFooter catalog={liveFixture()} />);
    const company = screen.getByText("Company").nextElementSibling as HTMLElement;
    expect(within(company).getByRole("link", { name: "FAQ" })).toHaveAttribute("href", "/faq");
    expect(within(company).getByRole("link", { name: "About" })).toHaveAttribute("href", "/about");
    expect(screen.queryByRole("link", { name: "Quality Standards" })).not.toBeInTheDocument();
    const legal = screen.getByText("Legal").nextElementSibling as HTMLElement;
    expect(within(legal).queryByRole("link", { name: "FAQ" })).not.toBeInTheDocument();
  });
});
