import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
vi.mock("@/lib/dal", () => ({ requireOwner: async () => ({ id: "owner" }) }));
const ops = {
  products: [{ slug: "bpc-157", shown: true }, { slug: "retatrutide", shown: false }],
  variants: [{ slug: "bpc-157", variant_id: "10mg", price_cents: 7900, low_at: 20, threepl_sku: null },
             { slug: "retatrutide", variant_id: "10mg", price_cents: 13900, low_at: 20, threepl_sku: null }],
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
    expect(screen.getByRole("link", { name: /^All\s*2/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Hidden\s*1/ })).toBeInTheDocument();
  });
  it("search by lot number", async () => {
    render(await CatalogPage({ searchParams: Promise.resolve({ q: "2609" }) }));
    expect(screen.queryByText("Retatrutide")).not.toBeInTheDocument();
  });
});
