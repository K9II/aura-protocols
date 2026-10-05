import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";

// Animations; jsdom has no canvas or matchMedia.
vi.mock("@/components/BiosignatureSphere", () => ({ default: () => null }));
vi.mock("@/components/ScrollReveal", () => ({ default: () => null }));
const { live } = vi.hoisted(() => ({ live: vi.fn() }));
vi.mock("@/lib/catalog-live", () => ({ getLiveCatalogOrNull: live }));

import HomePage from "@/app/page";
import { liveFixture } from "../helpers/live-catalog";

const renderHome = async () => render(await HomePage());

describe("/ (home)", () => {
  beforeEach(() => { live.mockReset(); live.mockResolvedValue({ all: liveFixture(), shown: liveFixture(), lots: [] }); });

  it("leads with Separated. Measured. Published. and the independent third-party US lab line", async () => {
    await renderHome();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Separated. Measured.Published.");
    expect(screen.getByText(/separated and measured by an independent third-party US lab before it goes on sale/i)).toBeInTheDocument();
    expect(screen.getByText(/published under the lot number printed on your vial/i)).toBeInTheDocument();
  });

  it("links the lineup heading to the full inventory", async () => {
    await renderHome();
    const heading = screen.getByRole("heading", { level: 2, name: /the lineup/i });
    const link = heading.querySelector("a");
    expect(link).not.toBeNull();
    expect(link!.getAttribute("href")).toBe("/products");
  });

  it("shows Tsvet's 1906 plate before the lineup, credited, with an HPLC trace linking to the real certificates", async () => {
    await renderHome();
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

  it("fails closed when the live catalog can't be read", async () => {
    live.mockResolvedValue(null);
    await renderHome();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Unavailable right now");
  });

  it("counts and features from the live shown catalog", async () => {
    const shown = liveFixture().filter((c) => c.chemicalClass !== "Incretin & Amylin Analogs");
    live.mockResolvedValue({ all: liveFixture(), shown, lots: [] });
    await renderHome();
    expect(screen.getByText(`See all ${shown.length} compounds →`)).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(shown.filter((c) => c.featured).length);
  });
});
