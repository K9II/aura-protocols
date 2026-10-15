import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import LotCertificates from "@/components/store/LotCertificates";
import type { PublicCert } from "@/data/catalog";
import { NOT_RECORDED_LAB } from "@/lib/coa/rules";

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

// The table is the desktop view; phones get stacked cards (CSS shows one), so table checks scope to it.
const table = () => within(document.querySelector<HTMLElement>(".s-lc-table")!);
const cardsEl = () => document.querySelector<HTMLElement>(".s-lc-cards")!;

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
    expect(table().getAllByRole("link", { name: "Open" })).toHaveLength(2);
    expect(table().getAllByRole("link", { name: "Verify ↗" })).toHaveLength(2);
  });

  it("adds a Measured column only when a certificate has a measured amount", () => {
    render(<LotCertificates certs={certs} />);
    expect(screen.queryByRole("columnheader", { name: "Measured" })).toBeNull();

    const withMeasured = [cert({ id: "c1", measuredMg: 10.42, measuredPct: 104 })];
    const { container } = render(<LotCertificates certs={withMeasured} />);
    expect(screen.getByRole("columnheader", { name: "Measured" })).toBeInTheDocument();
    expect(within(container.querySelector<HTMLElement>(".s-lc-table")!).getByText("10.42 mg · 104%")).toBeInTheDocument();
    expect(within(container.querySelector<HTMLElement>(".s-lc-cards")!).getByText("10.42 mg · 104%")).toBeInTheDocument();
  });

  it("renders nothing when no certificate of this slug is shipping", () => {
    const { container } = render(<LotCertificates certs={[cert({ shipping: false })]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("names the ISO lab in the legend", () => {
    render(<LotCertificates certs={certs} />);
    expect(screen.getByText(/Vanguard Laboratory: tested by an ISO\/IEC 17025-accredited US lab/)).toBeInTheDocument();
  });

  it("links 'All certificates' to /coa", () => {
    render(<LotCertificates certs={certs} />);
    expect(screen.getByRole("link", { name: "All certificates →" })).toHaveAttribute("href", "/coa");
  });

  it("adds ✕ Fail to the legend only when a certificate in the group has a failed test", () => {
    render(<LotCertificates certs={certs} />);
    expect(screen.queryByText(/✕ Fail/)).toBeNull();

    const withFailedTest = [cert({ tests: { identity: "pass", endotoxin: "fail", sterility: "not_tested", heavy_metals: "not_tested", fentanyl: "not_tested" } })];
    render(<LotCertificates certs={withFailedTest} />);
    expect(screen.getByText(/✓ Pass · ✕ Fail · — Not tested/)).toBeInTheDocument();
  });

  it("marks a failed row Failed next to its lab and lists its note under the table", () => {
    const withFailed = [
      cert({ id: "c1", labName: "Vanguard Laboratory", reportNumber: "VGD-24117" }),
      cert({ id: "c2", labName: "Freedom Diagnostics", reportNumber: "Aura2610080412", failed: true, note: "Sample vial damaged." }),
    ];
    render(<LotCertificates certs={withFailed} />);
    expect(table().getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("Failed · Aura2610080412: Sample vial damaged.")).toBeInTheDocument();
  });

  it("does not list a failed-row note when none passing rows are failed", () => {
    render(<LotCertificates certs={certs} />);
    expect(screen.queryByText(/^Failed ·/)).toBeNull();
  });

  it("shows 'Lab not recorded' instead of the placeholder lab name", () => {
    render(<LotCertificates certs={[cert({ labName: NOT_RECORDED_LAB })]} />);
    expect(table().getByText("Lab not recorded")).toBeInTheDocument();
    expect(within(cardsEl()).getByText("Lab not recorded")).toBeInTheDocument();
    expect(screen.queryByText(NOT_RECORDED_LAB)).toBeNull();
  });

  it("phones: one stacked card per certificate with lab, report, tested, purity, the test marks and Open / Verify", () => {
    render(<LotCertificates certs={certs} />);
    const cards = cardsEl().querySelectorAll(".s-lc-card");
    expect(cards).toHaveLength(2);
    const first = within(cards[0] as HTMLElement);
    expect(first.getByText("Vanguard Laboratory")).toBeInTheDocument();
    expect(first.getByText("VGD-24117")).toBeInTheDocument();
    expect(first.getByText("Oct 6, 2026")).toBeInTheDocument();
    expect(first.getByText("99.62% · HPLC+MS")).toBeInTheDocument();
    expect([...cards[0].querySelectorAll(".s-lc-tests span")].map((e) => e.textContent)).toEqual(["Identity ✓", "Endotoxin ✓", "Sterility —", "Metals —", "Fentanyl —"]);
    expect(first.getByRole("link", { name: "Open certificate" })).toHaveAttribute("href", "https://x/coa/AP-1107/1.pdf");
    expect(first.getByRole("link", { name: "Verify ↗" })).toHaveAttribute("href", "https://verifiedbyvanguard.com/verify/VGD-24117");
    // a certificate without purity shows a dash; Measured only when measured
    expect(within(cards[1] as HTMLElement).getByText("—")).toBeInTheDocument();
    expect(cardsEl().textContent).not.toContain("Measured");
  });
});
