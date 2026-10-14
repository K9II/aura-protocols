import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import SiteFooter from "@/components/store/SiteFooter";
import { liveFixture } from "../../helpers/live-catalog";

describe("SiteFooter", () => {
  it("carries the research-and-identification disclaimer", () => {
    render(<SiteFooter catalog={liveFixture()} />);
    expect(screen.getByText(/All products sold on this website are intended for research and identification purposes only\. They are not intended for human or animal use of any kind, including ingestion\./)).toBeInTheDocument();
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

  it("lists FAQ under Company, with Quality Standards nested under About", () => {
    render(<SiteFooter catalog={liveFixture()} />);
    const company = screen.getByText("Company").nextElementSibling as HTMLElement;
    expect(within(company).getByRole("link", { name: "FAQ" })).toHaveAttribute("href", "/faq");
    const about = within(company).getByRole("link", { name: "About" }).closest("li") as HTMLElement;
    expect(within(about).getByRole("link", { name: "Quality Standards" })).toHaveAttribute("href", "/quality-standards");
    const legal = screen.getByText("Legal").nextElementSibling as HTMLElement;
    expect(within(legal).queryByRole("link", { name: "FAQ" })).not.toBeInTheDocument();
  });
});
