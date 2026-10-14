import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
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
});
