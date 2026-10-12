import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CertCard from "@/components/store/CertCard";
import type { PublicCert } from "@/data/catalog";

export const pc = (x: Partial<PublicCert> = {}): PublicCert => ({
  id: "c1", lot: "AP-1107", slug: "ss-31", compoundName: "SS-31 (Elamipretide)", chemicalClass: "Mitochondrial & Metabolic", strength: "10 mg",
  lotStatus: "live", shipping: true, labName: "Vanguard Laboratory", labCity: "Olympia, WA", labIso: true, reportNumber: "VGD-24117",
  verifyUrl: "https://verifiedbyvanguard.com/verify/VGD-24117", testedOn: "2026-10-06", coaFile: "https://x/coa/AP-1107/1.pdf",
  purityPct: 99.62, method: "HPLC+MS", measuredMg: null, measuredPct: null,
  tests: { identity: "pass", endotoxin: "pass", sterility: "pass", heavy_metals: "not_tested", fentanyl: "not_tested" },
  failed: false, note: null, correction: null, correctedAt: null, labsOnLot: 1, ...x,
});

describe("CertCard", () => {
  it("shows lot, shipping, class, name, purity, tests, lab and both links", () => {
    render(<CertCard cert={pc()} />);
    expect(screen.getByText("Lot AP-1107")).toBeInTheDocument();
    expect(screen.getByText("Currently shipping")).toBeInTheDocument();
    expect(screen.getByText("Mitochondrial & Metabolic")).toBeInTheDocument();
    expect(screen.getByText("99.62")).toBeInTheDocument();
    expect(screen.getByText("Tested by an ISO/IEC 17025-accredited US lab")).toBeInTheDocument();
    expect(screen.getAllByText("✓ Pass")).toHaveLength(3);
    expect(screen.getAllByText("Not tested")).toHaveLength(2);
    expect(screen.getByRole("link", { name: /open certificate/i })).toHaveAttribute("href", "https://x/coa/AP-1107/1.pdf");
    expect(screen.getByRole("link", { name: /verify at lab/i })).toHaveAttribute("href", "https://verifiedbyvanguard.com/verify/VGD-24117");
  });
  it("non-ISO lab says Independent US lab; never calls the result accredited", () => {
    const { container } = render(<CertCard cert={pc({ labIso: false, labName: "Freedom Diagnostics" })} />);
    expect(screen.getByText("Independent US lab")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/accredited (result|certificate|test)/i);
  });
  it("failed: Failed label, Fail mark, note; re-tested tag; measured figure", () => {
    render(<CertCard cert={pc({ failed: true, note: "Sample vial damaged.", labsOnLot: 2, measuredMg: 8.61, measuredPct: 86, tests: { identity: "pass", endotoxin: "fail", sterility: "not_tested", heavy_metals: "not_tested", fentanyl: "not_tested" } })} />);
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("✕ Fail")).toBeInTheDocument();
    expect(screen.getByText("Sample vial damaged.")).toBeInTheDocument();
    expect(screen.getByText("Re-tested · 2 labs")).toBeInTheDocument();
    expect(screen.getByText("Measured · 86%")).toBeInTheDocument();
  });
  it("no verify link when the lab has none; correction shown", () => {
    render(<CertCard cert={pc({ verifyUrl: null, correction: "Report number corrected.", correctedAt: "2026-10-02T00:00:00Z" })} />);
    expect(screen.queryByRole("link", { name: /verify at lab/i })).toBeNull();
    expect(screen.getByText("Report number corrected.")).toBeInTheDocument();
  });
});
