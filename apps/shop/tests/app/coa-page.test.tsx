import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import type { PublicCert, PublicLot } from "@/data/catalog";

const { live } = vi.hoisted(() => ({ live: vi.fn() }));
vi.mock("@/lib/catalog-live", () => ({ getLiveCatalogOrNull: live }));
import CoaPage from "@/app/coa/page";

const lot = (no: string, status: PublicLot["status"], liveAt: string): PublicLot => ({
  lot: no, purityPct: 99.4, method: "HPLC+MS", testedOn: "2026-09-18", coaFile: `https://x/coa/${no}/1.pdf`,
  slug: "bpc-157", compoundName: "BPC-157", variantId: "10mg", strength: "10 mg", status, liveAt, onStore: true,
});

const cert = (lotNo: string, x: Partial<PublicCert> = {}): PublicCert => ({
  id: `${lotNo}-c`, lot: lotNo, slug: "bpc-157", compoundName: "BPC-157", chemicalClass: "Peptide Fragments", strength: "10 mg",
  lotStatus: "live", shipping: true, labName: "Vanguard Laboratory", labCity: "Olympia, WA", labIso: true, reportNumber: "VGD-1",
  verifyUrl: "https://x/verify/VGD-1", testedOn: "2026-09-18", coaFile: `https://x/coa/${lotNo}/1.pdf`,
  purityPct: 99.4, method: "HPLC+MS", measuredMg: null, measuredPct: null,
  tests: { identity: "pass", endotoxin: "pass", sterility: "not_tested", heavy_metals: "not_tested", fentanyl: "not_tested" },
  failed: false, note: null, correction: null, correctedAt: null, labsOnLot: 1, ...x,
});

async function lookUp(no: string) {
  render(await CoaPage());
  fireEvent.change(screen.getByLabelText("Lot number"), { target: { value: no } });
  fireEvent.click(screen.getByRole("button", { name: /look up/i }));
}

describe("/coa", () => {
  beforeEach(() => {
    live.mockReset();
    live.mockResolvedValue({
      all: [{ slug: "bpc-157", chemicalClass: "Peptide Fragments" }], shown: [], lots: [
        lot("BPC-2601-01", "retired", "2026-01-05T00:00:00Z"),
        lot("BPC-2605-01", "sold_out", "2026-05-05T00:00:00Z"),
        lot("BPC-2609-01", "live", "2026-09-20T00:00:00Z"),
      ], certificates: [cert("BPC-2601-01"), cert("BPC-2605-01")],
    });
  });

  it("finds every lot that was ever live, with its status and its certificate", async () => {
    await lookUp("bpc-2601-01");
    expect(screen.getByText("Lot BPC-2601-01 · Retired")).toBeInTheDocument();
    const region = within(screen.getByRole("status"));
    expect(region.getAllByRole("article")).toHaveLength(1);
    expect(region.getByRole("link", { name: /open certificate/i })).toHaveAttribute("href", "https://x/coa/BPC-2601-01/1.pdf");
  });

  it("looks up the lot in ?lot= on arrival (vial QR scans and order-page lot links)", async () => {
    window.history.replaceState(null, "", "/coa?lot=bpc-2609-01");
    try {
      render(await CoaPage());
      expect(screen.getByText("Lot BPC-2609-01 · Current")).toBeInTheDocument();
      expect(screen.getByLabelText("Lot number")).toHaveValue("bpc-2609-01");
    } finally {
      window.history.replaceState(null, "", "/");
    }
  });

  it("shows nothing looked up when there is no ?lot=", async () => {
    render(await CoaPage());
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(screen.getByLabelText("Lot number")).toHaveValue("");
  });

  it("labels the lot selling now as Current", async () => {
    await lookUp("BPC-2609-01");
    expect(screen.getByText("Lot BPC-2609-01 · Current")).toBeInTheDocument();
  });

  it("labels a live lot whose strength isn't on the store as Not on sale, not Current", async () => {
    live.mockResolvedValue({
      all: [{ slug: "bpc-157", chemicalClass: "Peptide Fragments" }], shown: [],
      lots: [{ ...lot("BPC-2609-01", "live", "2026-09-20T00:00:00Z"), onStore: false }],
      certificates: [],
    });
    await lookUp("BPC-2609-01");
    expect(screen.getByText("Lot BPC-2609-01 · Not on sale")).toBeInTheDocument();
  });

  it("says when a found lot has no visible certificate yet", async () => {
    await lookUp("BPC-2609-01");
    expect(screen.getByText("No certificate is published for this lot yet.")).toBeInTheDocument();
  });

  it("never lists a hidden product's lot", async () => {
    const { mergeCatalog } = await import("@/lib/catalog-merge");
    const { catalogContent } = await import("@/data/catalog");
    const row = (slug: string, no: string) => ({ id: no, lot_number: no, slug, variant_id: "10mg", purity_pct: 99.4, method: "HPLC+MS" as const,
      tested_on: "2026-09-18", coa_path: `${no}/1.pdf`, status: "live" as const, live_at: "2026-09-24T00:00:00Z", sellable: 100, held: 0, sold: 0, available: 100,
      purity_ok: true, endotoxin_ok: true });
    live.mockResolvedValue(mergeCatalog(catalogContent, {
      products: [{ slug: "bpc-157", shown: true }, { slug: "semaglutide", shown: false }],
      variants: [{ slug: "bpc-157", variant_id: "10mg", strength: "10 mg", price_cents: 7900, low_at: 10, threepl_sku: null, shown: true, archived_at: null }, { slug: "semaglutide", variant_id: "10mg", strength: "10 mg", price_cents: 11900, low_at: 10, threepl_sku: null, shown: true, archived_at: null }],
      lots: [row("bpc-157", "BPC-2609-01"), row("semaglutide", "SEM-2609-01")],
      certificates: [], coa: { showAll: false, showMeasured: false },
    }, (p) => `https://x/coa/${p}`));
    await lookUp("SEM-2609-01");
    expect(screen.getByText(/No lot “SEM-2609-01” found/)).toBeInTheDocument();
    expect(screen.queryByText(/Semaglutide/)).toBeNull();
  });

  it("shows the certificate library below the lookup when there are certificates", async () => {
    render(await CoaPage());
    expect(screen.getByRole("heading", { name: "The certificate library" })).toBeInTheDocument();
    expect(screen.getByText("2 certificates · 2 lots · 1 lab")).toBeInTheDocument();
  });

  it("hides the library when there are no certificates at all", async () => {
    live.mockResolvedValue({ all: [], shown: [], lots: [], certificates: [] });
    render(await CoaPage());
    expect(screen.queryByRole("heading", { name: "The certificate library" })).toBeNull();
  });

  it("fails closed when the live catalog can't be read", async () => {
    live.mockResolvedValue(null);
    render(await CoaPage());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Unavailable right now");
  });
});
