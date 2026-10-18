import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { PublicCert, PublicLot } from "@/data/catalog";

const { live, redirect } = vi.hoisted(() => ({ live: vi.fn(), redirect: vi.fn((to: string) => { throw new Error(`redirect:${to}`); }) }));
vi.mock("@/lib/catalog-live", () => ({ getLiveCatalogOrNull: live }));
vi.mock("next/navigation", () => ({ redirect }));
import LotCertificatePage from "@/app/coa/[lot]/page";

const lot = (no: string, slug = "bpc-157"): PublicLot => ({
  lot: no, purityPct: 99.4, method: "HPLC+MS", testedOn: "2026-09-18", coaFile: `https://x/coa/${no}/1.pdf`,
  slug, compoundName: slug === "bpc-157" ? "BPC-157" : "TB-500", variantId: "10mg", strength: "10 mg", status: "live", liveAt: "2026-09-20T00:00:00Z", onStore: true,
});
const cert = (lotNo: string): PublicCert => ({
  id: `${lotNo}-c`, lot: lotNo, slug: "bpc-157", compoundName: "BPC-157", chemicalClass: "Peptide Fragments", strength: "10 mg",
  lotStatus: "live", shipping: true, labName: "Vanguard Laboratory", labCity: "Olympia, WA", labIso: true, reportNumber: "VGD-1",
  verifyUrl: "https://x/verify/VGD-1", testedOn: "2026-09-18", coaFile: `https://x/coa/${lotNo}/1.pdf`,
  purityPct: 99.4, method: "HPLC+MS", measuredMg: null, measuredPct: null,
  tests: { identity: "pass", endotoxin: "pass", sterility: "not_tested", heavy_metals: "not_tested", fentanyl: "not_tested" },
  failed: false, note: null, correction: null, correctedAt: null, labsOnLot: 1,
});
const page = async (lotParam: string) => render(await LotCertificatePage({ params: Promise.resolve({ lot: lotParam }) }));

describe("/coa/[lot]", () => {
  beforeEach(() => {
    live.mockReset(); redirect.mockClear();
    live.mockResolvedValue({
      all: [{ slug: "bpc-157", chemicalClass: "Peptide Fragments" }, { slug: "tb-500", chemicalClass: "Peptide Fragments" }], shown: [],
      lots: [lot("BPC-2609-01"), lot("TB-2609-01", "tb-500")],
      certificates: [cert("BPC-2609-01"), { ...cert("TB-2609-01"), slug: "tb-500", compoundName: "TB-500" }],
    });
  });

  it("shows that lot's certificate only (the vial scan lands here, capitals and all)", async () => {
    await page("bpc-2609-01");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Your lot's certificate.");
    expect(screen.getByText("Lot BPC-2609-01 · Current")).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByRole("link", { name: /open certificate/i })).toHaveAttribute("href", "https://x/coa/BPC-2609-01/1.pdf");
    expect(screen.queryByText(/TB-2609-01/)).toBeNull(); // no library
    expect(screen.queryByLabelText("Lot number")).toBeNull(); // no search box
  });

  it("links to the lookup and to the full library", async () => {
    await page("BPC-2609-01");
    expect(screen.getByRole("link", { name: "Look up another lot" })).toHaveAttribute("href", "/coa");
    expect(screen.getByRole("link", { name: /see every certificate/i })).toHaveAttribute("href", "/coa#library");
  });

  it("an unknown lot goes back to the lookup, which says so", async () => {
    await expect(page("NOPE-1")).rejects.toThrow("redirect:/coa?lot=NOPE-1");
  });
});
