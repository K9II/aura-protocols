import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ownerStaff, assistantStaff } from "../../helpers/staff";
const m = vi.hoisted(() => ({ requirePermission: vi.fn(async () => (await import("../../helpers/staff")).ownerStaff()) }));
vi.mock("@/lib/dal", () => ({ requirePermission: m.requirePermission }));
vi.mock("@/app/admin/catalog/actions", () => ({ receiveLotAction: vi.fn(), coaUploadAction: vi.fn(), correctCountAction: vi.fn(), setFieldAction: vi.fn(), setShownAction: vi.fn(), putLiveAction: vi.fn(), retireAction: vi.fn(), replaceCertificateAction: vi.fn(),
  addStrengthAction: vi.fn(), setStrengthShownAction: vi.fn(), archiveStrengthAction: vi.fn(), restoreStrengthAction: vi.fn(), deleteStrengthAction: vi.fn() }));
// catalog-live.ts also imports fetchCatalogOps from catalog-ops/data at module
// scope (unstable_cache(fetchCatalogOps, ...)); mocked wholesale like every
// other test that touches it, so only coaPublicUrl is needed here.
vi.mock("@/lib/catalog-live", () => ({ coaPublicUrl: (p: string) => `https://coa.test/${p}` }));
const lot = (o: object) => ({ purity_pct: 99.4, method: "HPLC+MS", tested_on: "2026-09-18", coa_path: "x.pdf", ordered_qty: 200, counted_qty: 200, damaged_qty: 0, adjust_qty: 0, discrepancy_note: null, received_by: "owner", received_by_name: "Kearney", received_at: "2026-09-24T00:00:00Z", retired_at: null, held: 0, sold: 0, slug: "ss-31", ...o });
const draftLot = lot({ id: "b", lot_number: "SS50-2610-01", variant_id: "50mg", status: "draft", live_at: null, counted_qty: 96, damaged_qty: 2, ordered_qty: 100, discrepancy_note: "Short 4, 2 cracked", sellable: 94, available: 94 });
vi.mock("@/lib/catalog-ops/data", () => ({
  fetchAdminOps: async () => ({
    products: [{ slug: "ss-31", shown: true }],
    variants: [
      { slug: "ss-31", variant_id: "10mg", strength: "10 mg", price_cents: 7900, low_at: 20, threepl_sku: "AP-SS31-10", shown: true, archived_at: null },
      { slug: "ss-31", variant_id: "50mg", strength: "50 mg", price_cents: 10900, low_at: 10, threepl_sku: null, shown: true, archived_at: null },
      { slug: "ss-31", variant_id: "30mg", strength: "30 mg", price_cents: 9900, low_at: 10, threepl_sku: "AP-SS31-30", shown: false, archived_at: null },
      { slug: "ss-31", variant_id: "5mg", strength: "5 mg", price_cents: 4900, low_at: 10, threepl_sku: null, shown: false, archived_at: "2026-10-04T09:02:00Z" },
      { slug: "ss-31", variant_id: "2mg", strength: "2 mg", price_cents: 3900, low_at: 10, threepl_sku: null, shown: false, archived_at: "2026-10-03T09:02:00Z" },
    ],
    lots: [
      lot({ id: "a", lot_number: "SS10-2609-01", variant_id: "10mg", status: "live", live_at: "2026-09-24", sellable: 200, held: 3, sold: 159, available: 38 }),
      // Same live_at as "a" on a different variant — not a tie-break case by
      // itself, but a second live lot on 10 mg below shares live_at with "a"
      // to exercise the lot_number tie-break (hold_vials order).
      lot({ id: "c", lot_number: "SS10-2608-09", variant_id: "10mg", status: "live", live_at: "2026-09-24", sellable: 50, held: 0, sold: 0, available: 50 }),
      // A sold-out lot: still status "live", just available 0 — it needs to stay retirable.
      lot({ id: "h", lot_number: "SS10-2607-05", variant_id: "10mg", status: "live", live_at: "2026-07-01", sellable: 80, held: 0, sold: 80, available: 0 }),
      draftLot,
      lot({ id: "f", lot_number: "SS5-2608-01", variant_id: "5mg", status: "retired", live_at: "2026-08-01", sellable: 100, sold: 100, available: 0 }),
      lot({ id: "g", lot_number: "SS2-2609-01", variant_id: "2mg", status: "draft", live_at: null, sellable: 50, available: 50 }),
      lot({ id: "d", lot_number: "SS10-2611-01", variant_id: "10mg", status: "draft", live_at: null, coa_path: null, sellable: 190, discrepancy_note: null }),
    ],
  }),
  catalogEvents: async () => [
    { id: "e1", kind: "lot_live", lotNumber: "SS10-2609-01", actorName: "Kearney", created_at: "2026-10-03T18:05:00Z", before: null, after: null, reason: null, note: null, source: "manual", variant_id: "10mg", lot_id: "a", actor_id: "owner" },
    { id: "e2", kind: "price_changed", lotNumber: null, actorName: "Kearney", created_at: "2026-10-02T15:00:00Z", before: { price_cents: 7500 }, after: { price_cents: 7900 }, reason: null, note: null, source: "manual", variant_id: "10mg", lot_id: null, actor_id: "owner" },
    { id: "e4", kind: "strength_added", lotNumber: null, actorName: "Kearney", created_at: "2026-10-05T14:10:00Z", before: null, after: { strength: "30 mg", price_cents: 9900, shown: false }, reason: null, note: null, source: "manual", variant_id: "30mg", lot_id: null, actor_id: "owner" },
    { id: "e5", kind: "strength_archived", lotNumber: null, actorName: "Kearney", created_at: "2026-10-04T09:02:00Z", before: null, after: { strength: "5 mg" }, reason: null, note: null, source: "manual", variant_id: "5mg", lot_id: null, actor_id: "owner" },
    { id: "e6", kind: "strength_deleted", lotNumber: null, actorName: "Kearney", created_at: "2026-10-03T09:02:00Z", before: { strength: "20 mg", price_cents: 8900 }, after: null, reason: null, note: null, source: "manual", variant_id: "20mg", lot_id: null, actor_id: "owner" },
    { id: "e3", kind: "lot_mismatch", lotNumber: "SS10-2609-01", actorName: null, created_at: "2026-10-01T12:00:00Z", before: null, after: { order_number: "AP-1104", order_item_id: "oi1", shipped: [] }, reason: null, note: "moved", source: "3pl", variant_id: "10mg", lot_id: "a", actor_id: null },
  ],
  variantHistory: async () => new Map([["10mg", { lots: 3, orders: 12 }], ["50mg", { lots: 1, orders: 0 }], ["5mg", { lots: 2, orders: 47 }], ["2mg", { lots: 1, orders: 0 }]]),
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
    expect(screen.getByRole("link", { name: "AP-1104" })).toHaveAttribute("href", "/admin/orders/AP-1104");
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
  it("a sold-out live lot keeps its ⋯ menu (Retire, Replace certificate); a retired lot has none", async () => {
    // LotActions' ⋯ is a <summary>, which jsdom doesn't expose as role "button" — query by its aria-label instead.
    const { container } = render(await ProductPage({ params: Promise.resolve({ slug: "ss-31" }) }));
    const soldOutMenu = container.querySelector('[aria-label="More for SS10-2607-05"]');
    expect(soldOutMenu).toBeInTheDocument();
    expect(container.querySelector('[aria-label="More for SS5-2608-01"]')).not.toBeInTheDocument();
    expect(soldOutMenu!.nextElementSibling).toHaveTextContent("Retire lot");
    expect(soldOutMenu!.nextElementSibling).toHaveTextContent("Replace certificate");
  });

  describe("strengths (Screen 8)", () => {
    const page = async () => render(await ProductPage({ params: Promise.resolve({ slug: "ss-31" }) }));

    it("header counts strengths on the store, hidden and archived", async () => {
      await page();
      expect(screen.getByText(/2 strengths on the store · 1 hidden · 2 archived/)).toBeInTheDocument();
    });

    it("a hidden strength card is greyed, says Hidden, offers Show on store and the first-lot guidance", async () => {
      const { container } = await page();
      const card = screen.getByRole("heading", { name: "30 mg" }).closest(".a-card")!;
      expect(card).toHaveClass("hid");
      expect(card).toHaveTextContent("Hidden");
      expect(card.querySelector("button[type=submit]")).toHaveTextContent("Show on store");
      expect(card).toHaveTextContent("New strengths start hidden. Receive the first lot, put it live, then show it on the store.");
      expect(card).not.toHaveTextContent("No lots yet");
      expect(container.querySelectorAll(".a-card.hid")).toHaveLength(1);
    });

    it("archived strengths sit in their own section with lots, orders and Restore — not as cards", async () => {
      await page();
      expect(screen.queryByRole("heading", { name: "5 mg" })).not.toBeInTheDocument();
      expect(screen.getByText("Archived strengths · not on the store")).toBeInTheDocument();
      expect(screen.getByText("archived Oct 4 · 2 lots · 47 orders · certificates stay in COA lookup")).toBeInTheDocument();
      // only a strength whose lot went live keeps certificates in COA lookup
      expect(screen.getByText("archived Oct 3 · 1 lot · 0 orders")).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: "Restore" })).toHaveLength(2);
    });

    it("the ⋯ menu disables Delete with the reason when the strength has history", async () => {
      await page();
      fireEvent.click(screen.getByRole("button", { name: "More for 10 mg" }));
      const del = screen.getByRole("button", { name: /Delete strength/ });
      expect(del).toBeDisabled();
      expect(del).toHaveTextContent("This one has lots or orders, so archive it instead.");
    });

    it("the ⋯ menu allows Delete for a strength with no lots or orders", async () => {
      await page();
      fireEvent.click(screen.getByRole("button", { name: "More for 30 mg" }));
      expect(screen.getByRole("button", { name: /Delete strength/ })).toBeEnabled();
      expect(screen.getByRole("button", { name: /Show on store.*Customers see it again/ })).toBeInTheDocument();
    });

    it("renders the Add a strength button and dialog", async () => {
      await page();
      expect(screen.getByRole("button", { name: "Add a strength" })).toBeInTheDocument();
      expect(screen.getByText(/Add a strength · SS-31/)).toBeInTheDocument();
    });

    it("the On the store rail lists only strengths on the store", async () => {
      await page();
      const rail = screen.getByRole("heading", { name: "On the store" }).closest(".a-card")!;
      expect(rail).toHaveTextContent("10 mg");
      expect(rail).not.toHaveTextContent("30 mg");
      expect(rail).not.toHaveTextContent("5 mg");
    });

    it("activity reads the strength changes in plain words, even for a deleted strength", async () => {
      await page();
      expect(screen.getByText(/Kearney added/)).toHaveTextContent("Kearney added 30 mg · $99.00 · hidden");
      expect(screen.getByText(/Kearney archived/)).toHaveTextContent("Kearney archived 5 mg");
      expect(screen.getByText(/Kearney deleted/)).toHaveTextContent("Kearney deleted 20 mg");
    });
  });

  it("Assistant: no Receive lot, Add strength, Correct count or Put live; price shows as text", async () => {
    m.requirePermission.mockResolvedValueOnce(assistantStaff());
    render(await ProductPage({ params: Promise.resolve({ slug: "ss-31" }) }));
    expect(screen.queryByRole("button", { name: /Receive/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add a strength" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Correct count" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Put live" })).not.toBeInTheDocument();
    expect(screen.getByText("$79.00")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit Price per vial" })).not.toBeInTheDocument();
  });
});
