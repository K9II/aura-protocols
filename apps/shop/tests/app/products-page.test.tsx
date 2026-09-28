import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ProductsPage from "@/app/products/page";

async function renderPage(params: Record<string, string>) {
  const ui = await ProductsPage({ searchParams: Promise.resolve(params) });
  render(ui);
}

describe("/products", () => {
  it("lists all 27 compounds with no filter", async () => {
    await renderPage({});
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(27);
  });

  it("filters by chemical class", async () => {
    await renderPage({ cat: "Blends" });
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);
  });

  it("searches by name, CAS number or lot", async () => {
    await renderPage({ q: "tirzep" });
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["Tirzepatide"]);
  });

  it("ignores an unknown class", async () => {
    await renderPage({ cat: "Nope" });
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(27);
  });
});
