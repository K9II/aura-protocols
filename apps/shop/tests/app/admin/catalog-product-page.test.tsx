import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
vi.mock("@/lib/dal", () => ({ requireOwner: async () => ({ id: "owner" }) }));
vi.mock("@/app/admin/catalog/actions", () => ({ receiveLotAction: vi.fn(), coaUploadAction: vi.fn(), correctCountAction: vi.fn(), setFieldAction: vi.fn(), setShownAction: vi.fn(), putLiveAction: vi.fn(), retireAction: vi.fn(), replaceCertificateAction: vi.fn() }));
// catalog-live.ts also imports fetchCatalogOps from catalog-ops/data at module
// scope (unstable_cache(fetchCatalogOps, ...)); mocked wholesale like every
// other test that touches it, so only coaPublicUrl is needed here.
vi.mock("@/lib/catalog-live", () => ({ coaPublicUrl: (p: string) => `https://coa.test/${p}` }));
const lot = (o: object) => ({ purity_pct: 99.4, method: "HPLC+MS", tested_on: "2026-09-18", coa_path: "x.pdf", ordered_qty: 200, counted_qty: 200, damaged_qty: 0, adjust_qty: 0, discrepancy_note: null, received_by: "owner", received_at: "2026-09-24T00:00:00Z", retired_at: null, held: 0, sold: 0, slug: "ss-31", ...o });
vi.mock("@/lib/catalog-ops/data", () => ({
  fetchAdminOps: async () => ({
    products: [{ slug: "ss-31", shown: true }],
    variants: [{ slug: "ss-31", variant_id: "10mg", price_cents: 7900, low_at: 20, threepl_sku: "AP-SS31-10" }, { slug: "ss-31", variant_id: "50mg", price_cents: 10900, low_at: 10, threepl_sku: null }],
    lots: [
      lot({ id: "a", lot_number: "SS10-2609-01", variant_id: "10mg", status: "live", live_at: "2026-09-24", sellable: 200, held: 3, sold: 159, available: 38 }),
      lot({ id: "b", lot_number: "SS50-2610-01", variant_id: "50mg", status: "draft", live_at: null, counted_qty: 96, damaged_qty: 2, ordered_qty: 100, discrepancy_note: "Short 4, 2 cracked", sellable: 94, available: 94 }),
    ],
  }),
  catalogEvents: async () => [{ id: "e1", kind: "lot_live", lotNumber: "SS10-2609-01", actorName: "Kearney", created_at: "2026-10-03T18:05:00Z", before: null, after: null, reason: null, note: null, source: "manual", variant_id: "10mg", lot_id: "a", actor_id: "owner" }],
}));
import ProductPage from "@/app/admin/catalog/[slug]/page";

describe("/admin/catalog/[slug]", () => {
  it("each strength with price, low level, 3PL SKU and its lots; draft discrepancy note and Put live", async () => {
    render(await ProductPage({ params: Promise.resolve({ slug: "ss-31" }) }));
    expect(screen.getAllByText("SS10-2609-01")[0]).toBeInTheDocument();
    expect(screen.getByText("AP-SS31-10")).toBeInTheDocument();
    expect(screen.getAllByText(/Short 4, 2 cracked/)[0]).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Put live" })[0]).toBeInTheDocument();
    expect(screen.getByText(/Kearney put/)).toBeInTheDocument();
  });
  it("404s an unknown product", async () => {
    await expect(ProductPage({ params: Promise.resolve({ slug: "nope" }) })).rejects.toThrow();
  });
});
