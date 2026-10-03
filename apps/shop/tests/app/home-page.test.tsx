import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

// Animations; jsdom has no canvas or matchMedia.
vi.mock("@/components/BiosignatureSphere", () => ({ default: () => null }));
vi.mock("@/components/ScrollReveal", () => ({ default: () => null }));

import HomePage from "@/app/page";

describe("/ (home)", () => {
  it("leads with Separated. Measured. Published. and the independent third-party US lab line", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Separated. Measured.Published.");
    expect(screen.getByText(/separated and measured by an independent third-party US lab before it goes on sale/i)).toBeInTheDocument();
    expect(screen.getByText(/published under the lot number printed on your vial/i)).toBeInTheDocument();
  });

  it("links the lineup heading to the full inventory", () => {
    render(<HomePage />);
    const heading = screen.getByRole("heading", { level: 2, name: /the lineup/i });
    const link = heading.querySelector("a");
    expect(link).not.toBeNull();
    expect(link!.getAttribute("href")).toBe("/products");
  });

  it("shows Tsvet's 1906 plate before the lineup, credited, with an HPLC trace linking to the real certificates", () => {
    render(<HomePage />);
    const record = screen.getByRole("region", { name: /purity has a method/i });
    expect(within(record).getByRole("img", { name: /tsvet.*1906/i })).toBeInTheDocument();
    expect(within(record).getByRole("img", { name: /hplc chromatogram/i })).toBeInTheDocument();
    expect(record).toHaveTextContent(/Berichte der Deutschen Botanischen Gesellschaft 24 \(1906\)/);
    expect(record).toHaveTextContent(/public domain/i);
    expect(within(record).getByRole("link", { name: /certificate/i })).toHaveAttribute("href", "/coa");
    // Comes before the lineup.
    const lineup = screen.getByRole("heading", { level: 2, name: /the lineup/i });
    expect(record.compareDocumentPosition(lineup) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
