import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SiteFooter from "@/components/store/SiteFooter";
import { liveFixture } from "../../helpers/live-catalog";

describe("SiteFooter", () => {
  it("carries the research-and-identification disclaimer", () => {
    render(<SiteFooter catalog={liveFixture()} />);
    expect(screen.getByText(/All products sold on this website are intended for research and identification purposes only\. They are not intended for human or animal use of any kind, including ingestion\./)).toBeInTheDocument();
  });
});
