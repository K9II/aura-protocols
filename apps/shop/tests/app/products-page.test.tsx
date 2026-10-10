import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { liveFixture } from "../helpers/live-catalog";

const { live } = vi.hoisted(() => ({ live: vi.fn() }));
vi.mock("@/lib/catalog-live", () => ({ getLiveCatalogOrNull: live }));
import ProductsPage from "@/app/products/page";

// The live shown catalog as seeded: the six incretin & amylin analogs hidden.
const shown = () => liveFixture({ "ss-31:50mg": { lot: { lot: "SS-2609-02", purityPct: 99.1, method: "HPLC", testedOn: "2026-09-20", coaFile: "https://x/1.pdf" } } })
  .filter((c) => c.chemicalClass !== "Incretin & Amylin Analogs");

async function renderPage(params: Record<string, string>) {
  const ui = await ProductsPage({ searchParams: Promise.resolve(params) });
  render(ui);
}

describe("/products", () => {
  beforeEach(() => { live.mockReset(); live.mockResolvedValue({ all: liveFixture(), shown: shown(), lots: [] }); });

  it("lists all 23 shown compounds with no filter", async () => {
    await renderPage({});
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(23);
  });

  it("filters by chemical class", async () => {
    await renderPage({ cat: "Blends" });
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);
  });

  it("searches by name, CAS number or lot", async () => {
    await renderPage({ q: "tesamo" });
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["Tesamorelin"]);
  });

  it("never shows hidden compounds, even when searched for", async () => {
    await renderPage({ q: "semaglutide" });
    expect(screen.queryAllByRole("heading", { level: 3 })).toHaveLength(0);
  });

  it("ignores an unknown class", async () => {
    await renderPage({ cat: "Nope" });
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(23);
  });

  it("finds a product by any strength's lot number", async () => {
    await renderPage({ q: "ss-2609-02" });
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["SS-31 (Elamipretide)"]);
  });

  it("fails closed when the live catalog can't be read", async () => {
    live.mockResolvedValue(null);
    await renderPage({});
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Unavailable right now");
  });
});
