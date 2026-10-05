import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
vi.mock("@/lib/dal", () => ({ requireOwner: async () => ({ id: "owner" }) }));
const ops = {
  products: [{ slug: "bpc-157", shown: true }, { slug: "retatrutide", shown: false }],
  variants: [{ slug: "bpc-157", variant_id: "10mg", strength: "10 mg", price_cents: 7900, low_at: 20, threepl_sku: null, shown: true, archived_at: null },
             { slug: "bpc-157", variant_id: "20mg", strength: "20 mg", price_cents: 9900, low_at: 20, threepl_sku: null, shown: false, archived_at: null },
             { slug: "bpc-157", variant_id: "5mg", strength: "5 mg", price_cents: 4900, low_at: 20, threepl_sku: null, shown: false, archived_at: "2026-10-04T00:00:00Z" },
             { slug: "retatrutide", variant_id: "10mg", strength: "10 mg", price_cents: 13900, low_at: 20, threepl_sku: null, shown: true, archived_at: null }],
  lots: [{ id: "1", lot_number: "BPC-2609-01", slug: "bpc-157", variant_id: "10mg", purity_pct: 99.4, method: "HPLC+MS", tested_on: "2026-09-18", coa_path: "a.pdf", status: "live", live_at: "2026-09-24", sellable: 200, held: 0, sold: 0, available: 245, ordered_qty: 200, counted_qty: 200, damaged_qty: 0, adjust_qty: 0, discrepancy_note: null, received_by: null, received_at: "2026-09-24T00:00:00Z", retired_at: null }],
};
vi.mock("@/lib/catalog-ops/data", () => ({ fetchAdminOps: async () => ops }));
import CatalogPage from "@/app/admin/catalog/page";

describe("/admin/catalog", () => {
  it("one row per strength with price, stock and the lot selling now; hidden products dimmed", async () => {
    render(await CatalogPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getAllByText("BPC-157")[0]).toBeInTheDocument();
    expect(screen.getAllByText("$79.00")[0]).toBeInTheDocument();
    expect(screen.getAllByText("BPC-2609-01")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Hidden")[0]).toBeInTheDocument();
  });
  it("tab counts", async () => {
    render(await CatalogPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("link", { name: /^All\s*3/ })).toBeInTheDocument();
    // a hidden strength (BPC-157 20 mg, no lots) counts under Hidden, not Out of stock
    expect(screen.getByRole("link", { name: /^Hidden\s*2/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Out of stock\s*0/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Archived\s*1/ })).toBeInTheDocument();
  });
  it("search by lot number", async () => {
    render(await CatalogPage({ searchParams: Promise.resolve({ q: "2609" }) }));
    expect(screen.queryByText("Retatrutide")).not.toBeInTheDocument();
  });
  it("archived strengths show only under the Archived tab", async () => {
    const { unmount } = render(await CatalogPage({ searchParams: Promise.resolve({}) }));
    expect(screen.queryByText(/5 mg ·/)).not.toBeInTheDocument();
    unmount();
    render(await CatalogPage({ searchParams: Promise.resolve({ tab: "archived" }) }));
    expect(screen.getAllByText(/5 mg ·/)[0]).toBeInTheDocument();
    expect(screen.queryByText(/20 mg ·/)).not.toBeInTheDocument();
    expect(screen.getAllByText("Archived").length).toBeGreaterThan(1);
  });
  it("a hidden strength row is dimmed with the Hidden chip", async () => {
    render(await CatalogPage({ searchParams: Promise.resolve({ tab: "hidden" }) }));
    const row = screen.getAllByText(/20 mg ·/)[0].closest("tr")!;
    expect(row).toHaveClass("a-dim");
    expect(row).toHaveTextContent("Hidden");
  });
});
