import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import LotCertificates from "@/components/store/LotCertificates";
import type { PublicCert } from "@/data/catalog";

const cert = (x: Partial<PublicCert> = {}): PublicCert => ({
  id: "c1", lot: "AP-1107", slug: "ss-31", compoundName: "SS-31 (Elamipretide)", chemicalClass: "Mitochondrial & Metabolic", strength: "10 mg",
  lotStatus: "live", shipping: true, labName: "Vanguard Laboratory", labCity: "Olympia, WA", labIso: true, reportNumber: "VGD-24117",
  verifyUrl: "https://verifiedbyvanguard.com/verify/VGD-24117", testedOn: "2026-10-06", coaFile: "https://x/coa/AP-1107/1.pdf",
  purityPct: 99.62, method: "HPLC+MS", measuredMg: null, measuredPct: null,
  tests: { identity: "pass", endotoxin: "pass", sterility: "not_tested", heavy_metals: "not_tested", fentanyl: "not_tested" },
  failed: false, note: null, correction: null, correctedAt: null, labsOnLot: 2, ...x,
});

const certs: PublicCert[] = [
  cert({ id: "c1", labName: "Vanguard Laboratory", labIso: true, reportNumber: "VGD-24117" }),
  cert({
    id: "c2", labName: "Freedom Diagnostics", labIso: false, reportNumber: "Aura2610080412", testedOn: "2026-10-08",
    purityPct: null, method: null,
    tests: { identity: "not_tested", endotoxin: "pass", sterility: "pass", heavy_metals: "not_tested", fentanyl: "not_tested" },
  }),
  cert({ id: "c3", lot: "AP-1101", shipping: false, labName: "Vanguard Laboratory" }), // old, non-shipping lot
];

describe("LotCertificates", () => {
  it("shows the heading, two rows and the pass/not-tested marks", () => {
    render(<LotCertificates certs={certs} />);
    expect(screen.getByText("Certificates · 10 mg · lot AP-1107 · on sale now")).toBeInTheDocument();
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(3); // header + 2 certificates
    expect(screen.getAllByText("✓").length).toBeGreaterThan(0);
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("links to Open and Verify", () => {
    render(<LotCertificates certs={certs} />);
    expect(screen.getAllByRole("link", { name: "Open" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Verify ↗" })).toHaveLength(2);
  });

  it("adds a Measured column only when a certificate has a measured amount", () => {
    render(<LotCertificates certs={certs} />);
    expect(screen.queryByRole("columnheader", { name: "Measured" })).toBeNull();

    const withMeasured = [cert({ id: "c1", measuredMg: 10.42, measuredPct: 104 })];
    render(<LotCertificates certs={withMeasured} />);
    expect(screen.getByRole("columnheader", { name: "Measured" })).toBeInTheDocument();
    expect(screen.getByText("10.42 mg · 104%")).toBeInTheDocument();
  });

  it("renders nothing when no certificate of this slug is shipping", () => {
    const { container } = render(<LotCertificates certs={[cert({ shipping: false })]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("names the ISO lab in the legend", () => {
    render(<LotCertificates certs={certs} />);
    expect(screen.getByText(/Vanguard Laboratory: tested by an ISO\/IEC 17025-accredited US lab/)).toBeInTheDocument();
  });
});
