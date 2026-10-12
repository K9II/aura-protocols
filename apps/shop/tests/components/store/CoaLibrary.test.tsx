import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CoaLibrary from "@/components/store/CoaLibrary";
import type { PublicCert } from "@/data/catalog";

const cert = (x: Partial<PublicCert> = {}): PublicCert => ({
  id: "c1", lot: "AP-1", slug: "bpc-157", compoundName: "BPC-157", chemicalClass: "Peptide Fragments", strength: "10 mg",
  lotStatus: "live", shipping: true, labName: "Vanguard Laboratory", labCity: "Olympia, WA", labIso: true, reportNumber: "VGD-1",
  verifyUrl: "https://x/verify/VGD-1", testedOn: "2026-10-06", coaFile: "https://x/coa/AP-1/1.pdf",
  purityPct: 99.5, method: "HPLC+MS", measuredMg: null, measuredPct: null,
  tests: { identity: "pass", endotoxin: "pass", sterility: "pass", heavy_metals: "not_tested", fentanyl: "not_tested" },
  failed: false, note: null, correction: null, correctedAt: null, labsOnLot: 1, ...x,
});

const fourCerts: PublicCert[] = [
  cert({ id: "c1", lot: "AP-1", slug: "bpc-157", compoundName: "BPC-157", labName: "Vanguard Laboratory" }),
  cert({ id: "c2", lot: "AP-1", slug: "bpc-157", compoundName: "BPC-157", labName: "Freedom Diagnostics", labIso: false, tests: { identity: "not_tested", endotoxin: "pass", sterility: "not_tested", heavy_metals: "not_tested", fentanyl: "not_tested" }, labsOnLot: 2 }),
  cert({ id: "c3", lot: "AP-2", slug: "ss-31", compoundName: "SS-31 (Elamipretide)", chemicalClass: "Mitochondrial & Metabolic", labName: "Vanguard Laboratory" }),
  cert({ id: "c4", lot: "AP-3", slug: "tirzepatide", compoundName: "Tirzepatide", chemicalClass: "Incretin & Amylin Analogs", labName: "Freedom Diagnostics", labIso: false, shipping: false, tests: { identity: "pass", endotoxin: "pass", sterility: "not_tested", heavy_metals: "not_tested", fentanyl: "not_tested" } }),
];

describe("CoaLibrary", () => {
  it("shows the certificate / lot / lab count", () => {
    render(<CoaLibrary certs={fourCerts} />);
    expect(screen.getByText("4 certificates · 3 lots · 2 labs")).toBeInTheDocument();
  });

  it("narrows the grid by product", () => {
    render(<CoaLibrary certs={fourCerts} />);
    expect(screen.getAllByRole("article")).toHaveLength(4);
    fireEvent.change(screen.getByLabelText("Product"), { target: { value: "bpc-157" } });
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("the Sterility pill keeps only certificates with sterility pass", () => {
    render(<CoaLibrary certs={fourCerts} />);
    fireEvent.click(screen.getByRole("button", { name: /sterility/i }));
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("Currently shipping only drops a non-shipping certificate", () => {
    render(<CoaLibrary certs={fourCerts} />);
    fireEvent.click(screen.getByLabelText(/currently shipping only/i));
    expect(screen.getAllByRole("article")).toHaveLength(3);
  });

  it("shows a reset message when filters match nothing", () => {
    render(<CoaLibrary certs={fourCerts} />);
    fireEvent.change(screen.getByLabelText("Product"), { target: { value: "tirzepatide" } });
    fireEvent.click(screen.getByRole("button", { name: /sterility/i }));
    expect(screen.queryAllByRole("article")).toHaveLength(0);
    expect(screen.getByText("No certificates match.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /clear the filters/i }));
    expect(screen.getAllByRole("article")).toHaveLength(4);
  });

  it("paginates past 12 with Show 12 more", () => {
    const many: PublicCert[] = Array.from({ length: 24 }, (_, i) => cert({ id: `m${i}`, lot: `AP-${100 + i}` }));
    render(<CoaLibrary certs={many} />);
    expect(screen.getAllByRole("article")).toHaveLength(12);
    fireEvent.click(screen.getByRole("button", { name: /show 12 more/i }));
    expect(screen.getAllByRole("article")).toHaveLength(24);
  });

  it("Currently shipping only returns to the first page after Show 12 more", () => {
    const many: PublicCert[] = Array.from({ length: 24 }, (_, i) => cert({ id: `m${i}`, lot: `AP-${100 + i}` }));
    render(<CoaLibrary certs={many} />);
    fireEvent.click(screen.getByRole("button", { name: /show 12 more/i }));
    expect(screen.getAllByRole("article")).toHaveLength(24);
    fireEvent.click(screen.getByLabelText(/currently shipping only/i));
    expect(screen.getAllByRole("article")).toHaveLength(12);
  });

  it("the Any pill returns to the first page after Show 12 more", () => {
    const many: PublicCert[] = Array.from({ length: 24 }, (_, i) => cert({ id: `m${i}`, lot: `AP-${100 + i}` }));
    render(<CoaLibrary certs={many} />);
    fireEvent.click(screen.getByRole("button", { name: /show 12 more/i }));
    expect(screen.getAllByRole("article")).toHaveLength(24);
    fireEvent.click(screen.getByRole("button", { name: "Any" }));
    expect(screen.getAllByRole("article")).toHaveLength(12);
  });
});
