import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { PublicLot } from "@/data/catalog";

const { live } = vi.hoisted(() => ({ live: vi.fn() }));
vi.mock("@/lib/catalog-live", () => ({ getLiveCatalogOrNull: live }));
import CoaPage from "@/app/coa/page";

const lot = (no: string, status: PublicLot["status"], liveAt: string): PublicLot => ({
  lot: no, purityPct: 99.4, method: "HPLC+MS", testedOn: "2026-09-18", coaFile: `https://x/coa/${no}/1.pdf`,
  slug: "bpc-157", compoundName: "BPC-157", variantId: "10mg", strength: "10 mg", status, liveAt, onStore: true,
});

async function lookUp(no: string) {
  render(await CoaPage());
  fireEvent.change(screen.getByLabelText("Lot number"), { target: { value: no } });
  fireEvent.click(screen.getByRole("button", { name: /look up/i }));
}

describe("/coa", () => {
  beforeEach(() => {
    live.mockReset();
    live.mockResolvedValue({ all: [], shown: [], lots: [
      lot("BPC-2601-01", "retired", "2026-01-05T00:00:00Z"),
      lot("BPC-2605-01", "sold_out", "2026-05-05T00:00:00Z"),
      lot("BPC-2609-01", "live", "2026-09-20T00:00:00Z"),
    ] });
  });

  it("finds every lot that was ever live, with its status and strength", async () => {
    await lookUp("bpc-2601-01");
    expect(screen.getByText("Lot BPC-2601-01 · Retired")).toBeInTheDocument();
    expect(screen.getByText(/10 mg · Purity 99.4%/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open certificate/i })).toHaveAttribute("href", "https://x/coa/BPC-2601-01/1.pdf");
  });

  it("labels the lot selling now as Current", async () => {
    await lookUp("BPC-2609-01");
    expect(screen.getByText("Lot BPC-2609-01 · Current")).toBeInTheDocument();
  });

  it("never lists a hidden product's lot", async () => {
    const { mergeCatalog } = await import("@/lib/catalog-merge");
    const { catalogContent } = await import("@/data/catalog");
    const row = (slug: string, no: string) => ({ id: no, lot_number: no, slug, variant_id: "10mg", purity_pct: 99.4, method: "HPLC+MS" as const,
      tested_on: "2026-09-18", coa_path: `${no}/1.pdf`, status: "live" as const, live_at: "2026-09-24T00:00:00Z", sellable: 100, held: 0, sold: 0, available: 100 });
    live.mockResolvedValue(mergeCatalog(catalogContent, {
      products: [{ slug: "bpc-157", shown: true }, { slug: "semaglutide", shown: false }],
      variants: [{ slug: "bpc-157", variant_id: "10mg", strength: "10 mg", price_cents: 7900, low_at: 10, threepl_sku: null, shown: true, archived_at: null }, { slug: "semaglutide", variant_id: "10mg", strength: "10 mg", price_cents: 11900, low_at: 10, threepl_sku: null, shown: true, archived_at: null }],
      lots: [row("bpc-157", "BPC-2609-01"), row("semaglutide", "SEM-2609-01")],
    }, (p) => `https://x/coa/${p}`));
    await lookUp("SEM-2609-01");
    expect(screen.getByText(/No lot “SEM-2609-01” found/)).toBeInTheDocument();
    expect(screen.queryByText(/Semaglutide/)).toBeNull();
  });

  it("fails closed when the live catalog can't be read", async () => {
    live.mockResolvedValue(null);
    render(await CoaPage());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Unavailable right now");
  });
});
