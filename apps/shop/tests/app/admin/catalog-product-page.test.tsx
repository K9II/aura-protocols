import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
vi.mock("@/lib/dal", () => ({ requireOwner: async () => ({ id: "owner" }) }));
vi.mock("@/app/admin/catalog/actions", () => ({ receiveLotAction: vi.fn(), coaUploadAction: vi.fn(), correctCountAction: vi.fn(), setFieldAction: vi.fn(), setShownAction: vi.fn(), putLiveAction: vi.fn(), retireAction: vi.fn(), replaceCertificateAction: vi.fn() }));
// catalog-live.ts also imports fetchCatalogOps from catalog-ops/data at module
// scope (unstable_cache(fetchCatalogOps, ...)); mocked wholesale like every
// other test that touches it, so only coaPublicUrl is needed here.
vi.mock("@/lib/catalog-live", () => ({ coaPublicUrl: (p: string) => `https://coa.test/${p}` }));
const lot = (o: object) => ({ purity_pct: 99.4, method: "HPLC+MS", tested_on: "2026-09-18", coa_path: "x.pdf", ordered_qty: 200, counted_qty: 200, damaged_qty: 0, adjust_qty: 0, discrepancy_note: null, received_by: "owner", received_by_name: "Kearney", received_at: "2026-09-24T00:00:00Z", retired_at: null, held: 0, sold: 0, slug: "ss-31", ...o });
const draftLot = lot({ id: "b", lot_number: "SS50-2610-01", variant_id: "50mg", status: "draft", live_at: null, counted_qty: 96, damaged_qty: 2, ordered_qty: 100, discrepancy_note: "Short 4, 2 cracked", sellable: 94, available: 94 });
vi.mock("@/lib/catalog-ops/data", () => ({
  fetchAdminOps: async () => ({
    products: [{ slug: "ss-31", shown: true }],
    variants: [{ slug: "ss-31", variant_id: "10mg", price_cents: 7900, low_at: 20, threepl_sku: "AP-SS31-10" }, { slug: "ss-31", variant_id: "50mg", price_cents: 10900, low_at: 10, threepl_sku: null }],
    lots: [
      lot({ id: "a", lot_number: "SS10-2609-01", variant_id: "10mg", status: "live", live_at: "2026-09-24", sellable: 200, held: 3, sold: 159, available: 38 }),
      // Same live_at as "a" on a different variant — not a tie-break case by
      // itself, but a second live lot on 10 mg below shares live_at with "a"
      // to exercise the lot_number tie-break (hold_vials order).
      lot({ id: "c", lot_number: "SS10-2608-09", variant_id: "10mg", status: "live", live_at: "2026-09-24", sellable: 50, held: 0, sold: 0, available: 50 }),
      draftLot,
      lot({ id: "d", lot_number: "SS10-2611-01", variant_id: "10mg", status: "draft", live_at: null, coa_path: null, sellable: 190, discrepancy_note: null }),
    ],
  }),
  catalogEvents: async () => [
    { id: "e1", kind: "lot_live", lotNumber: "SS10-2609-01", actorName: "Kearney", created_at: "2026-10-03T18:05:00Z", before: null, after: null, reason: null, note: null, source: "manual", variant_id: "10mg", lot_id: "a", actor_id: "owner" },
    { id: "e2", kind: "price_changed", lotNumber: null, actorName: "Kearney", created_at: "2026-10-02T15:00:00Z", before: { price_cents: 7500 }, after: { price_cents: 7900 }, reason: null, note: null, source: "manual", variant_id: "10mg", lot_id: null, actor_id: "owner" },
    { id: "e3", kind: "lot_mismatch", lotNumber: "SS10-2609-01", actorName: null, created_at: "2026-10-01T12:00:00Z", before: null, after: { order_number: "AP-1104", order_item_id: "oi1", shipped: [] }, reason: null, note: "moved", source: "3pl", variant_id: "10mg", lot_id: "a", actor_id: null },
  ],
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
  it("received cell shows who and when, not just the date", async () => {
    render(await ProductPage({ params: Promise.resolve({ slug: "ss-31" }) }));
    expect(screen.getAllByText(/Kearney · Sep 24/)[0]).toBeInTheDocument();
  });
  it("activity price change names the strength, not the raw variant id", async () => {
    render(await ProductPage({ params: Promise.resolve({ slug: "ss-31" }) }));
    expect(screen.getByText(/changed 10 mg price/)).toBeInTheDocument();
    expect(screen.queryByText(/changed 10mg price/)).not.toBeInTheDocument();
  });
  it("lot mismatch reads in plain words and links the order", async () => {
    render(await ProductPage({ params: Promise.resolve({ slug: "ss-31" }) }));
    expect(screen.getByText(/vials moved to the shipped lot/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "AP-1104" })).toHaveAttribute("href", "/admin/orders?status=all#AP-1104");
  });
  it("disables Put live with the refusal reason when the certificate's missing", async () => {
    render(await ProductPage({ params: Promise.resolve({ slug: "ss-31" }) }));
    const disabled = screen.getAllByRole("button", { name: "Put live" }).find((b) => b.hasAttribute("disabled"));
    expect(disabled).toHaveAttribute("title", "Attach the certificate first.");
  });
  it("orders live lots oldest first, tying on lot number like hold_vials", async () => {
    render(await ProductPage({ params: Promise.resolve({ slug: "ss-31" }) }));
    const refs = screen.getAllByText(/^SS10-/).map((n) => n.textContent);
    expect(refs.indexOf("SS10-2608-09")).toBeLessThan(refs.indexOf("SS10-2609-01"));
  });
});
