import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderSection } from "@/components/PostBody";
import type { Section } from "@/data/posts";

const ctaSection: Section = {
  type: "cta",
  text: "Learn more",
  vendor: "Some Vendor",
  productSlug: "bpc-157",
  affiliateUrl: "https://some-vendor-example.com/product?ref=aurapro",
};

describe("PostBody cta rendering", () => {
  it("never renders the affiliateUrl or any external vendor domain", () => {
    render(<>{renderSection(ctaSection, 0)}</>);
    const links = screen.getAllByRole("link");
    for (const link of links) {
      const href = link.getAttribute("href") ?? "";
      expect(href).not.toContain(ctaSection.affiliateUrl);
      expect(href).not.toMatch(/^https?:\/\//);
    }
  });

  it("links internally to /products/<slug> when the compound exists in the catalog", () => {
    render(<>{renderSection(ctaSection, 0)}</>);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/products/bpc-157");
  });

  it("renders nothing when the section has no productSlug", () => {
    const { container } = render(<>{renderSection({ ...ctaSection, productSlug: undefined }, 0)}</>);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the productSlug no longer exists in the catalog", () => {
    const { container } = render(<>{renderSection({ ...ctaSection, productSlug: "discontinued-compound" }, 0)}</>);
    expect(container).toBeEmptyDOMElement();
  });
});
