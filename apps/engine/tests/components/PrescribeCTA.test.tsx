import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import PrescribeCTA from "@/components/PrescribeCTA";
import { CLINICAL_URL, PRESCRIBE_CTA_COPY } from "@/lib/constants";

describe("PrescribeCTA", () => {
  it("renders a link to the Clinical brand with safe rel and new tab", () => {
    render(<PrescribeCTA template="RECOVERY" />);
    const link = screen.getByRole("link", { name: PRESCRIBE_CTA_COPY });
    expect(link.getAttribute("href")).toContain(CLINICAL_URL);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toMatch(/noopener/);
    expect(link.getAttribute("rel")).toMatch(/noreferrer/);
  });

  it("passes the template as a tracking param", () => {
    render(<PrescribeCTA template="GH" />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toMatch(/[?&]template=GH/);
  });
});
