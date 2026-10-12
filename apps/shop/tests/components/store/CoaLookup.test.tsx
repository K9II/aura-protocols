import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CoaLookup, { type LotHit } from "@/components/store/CoaLookup";
import type { PublicCert } from "@/data/catalog";

const lots: LotHit[] = [
  { lot: "AP-1107", name: "SS-31 (Elamipretide)", slug: "ss-31", strength: "10 mg", status: "Current", chemicalClass: "Mitochondrial & Metabolic" },
  { lot: "AP-1101", name: "MOTS-c", slug: "mots-c", strength: "10 mg", status: "Sold out", chemicalClass: "Mitochondrial & Metabolic" },
];

const cert = (x: Partial<PublicCert> = {}): PublicCert => ({
  id: "c1", lot: "AP-1107", slug: "ss-31", compoundName: "SS-31 (Elamipretide)", chemicalClass: "Mitochondrial & Metabolic", strength: "10 mg",
  lotStatus: "live", shipping: true, labName: "Vanguard Laboratory", labCity: "Olympia, WA", labIso: true, reportNumber: "VGD-1",
  verifyUrl: "https://x/verify/VGD-1", testedOn: "2026-10-06", coaFile: "https://x/coa/AP-1107/1.pdf",
  purityPct: 99.62, method: "HPLC+MS", measuredMg: null, measuredPct: null,
  tests: { identity: "pass", endotoxin: "pass", sterility: "not_tested", heavy_metals: "not_tested", fentanyl: "not_tested" },
  failed: false, note: null, correction: null, correctedAt: null, labsOnLot: 2, ...x,
});

const certs: PublicCert[] = [
  cert({ id: "c1", labName: "Vanguard Laboratory" }),
  cert({ id: "c2", labName: "Freedom Diagnostics", labIso: false, purityPct: null, method: null,
    tests: { identity: "not_tested", endotoxin: "pass", sterility: "pass", heavy_metals: "not_tested", fentanyl: "not_tested" } }),
];

function lookUp(no: string) {
  fireEvent.change(screen.getByLabelText(/lot number/i), { target: { value: no } });
  fireEvent.click(screen.getByRole("button", { name: /look up/i }));
}

describe("CoaLookup", () => {
  it("shows the lot's status, product link and every visible certificate (no name repeated)", () => {
    render(<CoaLookup lots={lots} certs={certs} />);
    lookUp("ap-1107");
    expect(screen.getByText("Lot AP-1107 · Current")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "SS-31 (Elamipretide)" })).toHaveAttribute("href", "/products/ss-31");
    expect(screen.getByText("2 certificates · 2 labs")).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(screen.queryByRole("heading", { name: /SS-31/ })).toBeNull();
  });

  it("says when a lot has no visible certificates", () => {
    render(<CoaLookup lots={lots} certs={certs} />);
    lookUp("AP-1101");
    expect(screen.getByText("Lot AP-1101 · Sold out")).toBeInTheDocument();
    expect(screen.getByText(/certificate file is being uploaded/i)).toBeInTheDocument();
  });

  it("reports an unknown lot", () => {
    render(<CoaLookup lots={lots} certs={certs} />);
    lookUp("XX-1");
    expect(screen.getByText(/no lot “XX-1”/i)).toBeInTheDocument();
  });

  it("marks the lot input required", () => {
    render(<CoaLookup lots={lots} certs={certs} />);
    expect(screen.getByLabelText(/lot number/i)).toBeRequired();
  });

  it("does not show a result when submitted blank", () => {
    render(<CoaLookup lots={lots} certs={certs} />);
    fireEvent.click(screen.getByRole("button", { name: /look up/i }));
    expect(screen.queryByText(/no lot/i)).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("announces the result region via role=status", () => {
    render(<CoaLookup lots={lots} certs={certs} />);
    lookUp("AP-1107");
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toContainElement(screen.getByText("Lot AP-1107 · Current"));
  });
});
