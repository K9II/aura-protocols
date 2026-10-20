import { readFileSync } from "node:fs";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { liveFixture } from "../helpers/live-catalog";
import { fireEvent, render, screen, within } from "@testing-library/react";
import ProductPage from "@/app/products/[slug]/page";
import { CartProvider } from "@/components/store/CartProvider";

const { live } = vi.hoisted(() => ({ live: vi.fn() }));
vi.mock("@/lib/catalog-live", () => ({ getLiveCatalogOrNull: live, getLiveCatalog: live }));
vi.mock("@/components/store/MoleculeViewer", () => ({
  default: ({ structure }: { structure: { label: string } }) => <div data-testid="mol">{structure.label}</div>,
}));

const LOTS = [{
  lot: "AP-1107", slug: "bpc-157", compoundName: "BPC-157", strength: "10 mg", variantId: "10mg", purityPct: 99.62, method: "HPLC+MS",
  testedOn: "2026-10-06", liveAt: "2026-10-07T12:00:00Z", coaFile: "https://x/coa/AP-1107/1.pdf", status: "live", onStore: true,
}];

async function renderSlug(slug: string) {
  const ui = await ProductPage({ params: Promise.resolve({ slug }) });
  return render(<CartProvider catalog={liveFixture()}>{ui}</CartProvider>);
}

describe("product page", () => {
  beforeEach(() => { live.mockReset(); live.mockResolvedValue({ all: liveFixture(), shown: liveFixture(), lots: [], certificates: [] }); });

  it("fails closed when the live catalog can't be read: Unavailable, no price", async () => {
    live.mockResolvedValue(null);
    const { container } = await renderSlug("bpc-157");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Unavailable right now");
    expect(container.textContent).not.toMatch(/\$\d/);
    expect(screen.queryByRole("button", { name: /add to cart/i })).toBeNull();
  });

  it("404s a product the live catalog doesn't show", async () => {
    live.mockResolvedValue({ all: liveFixture(), shown: liveFixture().filter((c) => c.slug !== "bpc-157"), lots: [], certificates: [] });
    await expect(ProductPage({ params: Promise.resolve({ slug: "bpc-157" }) })).rejects.toThrow();
  });

  it("carries the processor's research-only line next to the RUO label", async () => {
    await renderSlug("bpc-157");
    expect(screen.getByText("All products currently listed on this site are for research purposes only.")).toBeInTheDocument();
  });

  it("shows the COA tag and the selected strength's lot", async () => {
    const { container } = await renderSlug("bpc-157");
    expect(container.querySelector(".s-media")).toHaveTextContent("◇ COA on file");
    expect(screen.getByText("BPC-2609-01")).toBeInTheDocument();
  });

  it("folds the selected lot's certificate into the Lot record: tests, links, ISO lab; no separate table", async () => {
    live.mockResolvedValue({
      all: liveFixture(), shown: liveFixture(), lots: LOTS, certificates: [{
        id: "c1", lot: "AP-1107", slug: "bpc-157", compoundName: "BPC-157", chemicalClass: "Peptide Fragments", strength: "10 mg",
        lotStatus: "live", shipping: true, labName: "Vanguard Laboratory", labCity: "Olympia, WA", labIso: true, reportNumber: "VGD-24117",
        verifyUrl: "https://x/verify/VGD-24117", testedOn: "2026-10-06", coaFile: "https://x/coa/AP-1107/1.pdf",
        purityPct: 99.62, method: "HPLC+MS", measuredMg: null, measuredPct: null,
        tests: { identity: "pass", endotoxin: "pass", sterility: "not_tested", heavy_metals: "not_tested", fentanyl: "not_tested" },
        failed: false, note: null, correction: null, correctedAt: null, labsOnLot: 1,
      }],
    });
    const { container } = await renderSlug("bpc-157");
    expect(container.querySelector(".s-pdp-certs")).toBeNull();
    const rec = container.querySelector(".s-rec--product")!;
    // the Lot record is the one place that opens the certificate (no link by the price)
    expect(container.querySelector(".s-certlink")).toBeNull();
    expect(rec.querySelector(".s-rec-tests")).toHaveTextContent(/Identity ✓.*Endotoxin ✓.*Sterility —/);
    expect(within(rec as HTMLElement).getByRole("link", { name: "Open certificate →" })).toHaveAttribute("href", "https://x/coa/AP-1107/1.pdf");
    expect(within(rec as HTMLElement).getByRole("link", { name: "Verify at the lab ↗" })).toHaveAttribute("href", "https://x/verify/VGD-24117");
    expect(rec).toHaveTextContent("Vanguard Laboratory: tested by an ISO/IEC 17025-accredited US lab");
    // one lot: no lot table (it would only repeat the box); desktop stamps sit under the record
    expect(rec.querySelector(".s-rec-table")).toBeNull();
    expect(container.querySelector(".s-media > .s-trust--pdp-desk")).not.toBeNull();
  });

  it("orders sections: hero, About this compound, Compound data, Researchers also added (no Material & testing)", async () => {
    await renderSlug("bpc-157");
    const h2s = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(h2s).toEqual(["About this compound", "Compound data", "Researchers also added"]);
  });

  it("monograph placard carries the identity; Compound data has the Made by row", async () => {
    const { container } = await renderSlug("bpc-157");
    const placard = container.querySelector(".s-pdp-placard")!;
    expect(placard.textContent).toContain("Monograph · Peptide Fragments");
    expect(placard.textContent).toContain("137525-51-0");
    expect(container.querySelector(".s-ghost")?.textContent).toBe("BPC-157");
    const data = screen.getByRole("heading", { name: "Compound data" }).closest("section")!;
    expect(within(data).getByText("Made by")).toBeInTheDocument();
    expect(within(data).getByText("Solid-phase synthesis, HPLC-purified")).toBeInTheDocument();
  });

  it("a blend's placard lists what it contains, one per line, in place of CAS and formula", async () => {
    const { container } = await renderSlug("bpc-157-tb-500-ghk-cu-kpv");
    const placard = container.querySelector(".s-pdp-placard")!;
    expect(within(placard as HTMLElement).getByText("Contains")).toBeInTheDocument();
    expect([...placard.querySelectorAll(".s-pdp-part")].map((e) => e.textContent)).toEqual(["BPC-157", "TB-500", "GHK-Cu", "KPV"]);
    expect(placard.textContent).not.toContain("CAS");
  });

  it("the vial shows its lot: a scan code for that lot's certificate on the placard and a line under the picture", async () => {
    const { container } = await renderSlug("bpc-157");
    const scan = container.querySelector(".s-pdp-placard .s-pdp-scan")!;
    expect(scan).toHaveTextContent("Scan for lot's certificate of analysis");
    expect(scan.querySelector("svg path")!.getAttribute("d")).toMatch(/^M\d+,\d+h1v1h-1z/);
    expect(container.querySelector(".s-pdp-vial .s-vialturn")).not.toBeNull();
    // the store's still vial paints first (no WebGL in tests)
    expect(within(container.querySelector(".s-pdp-vial") as HTMLElement).getByRole("img", { name: /BPC-157 .* vial$/ })).toBeInTheDocument();
    expect(container.querySelector(".s-pdp-qrnote")).toHaveTextContent("Every vial carries a QR code that opens its lot's certificate of analysis.");
  });

  it("the vial and the scan code follow the size picker: each strength shows its own lot and code", async () => {
    const shown = liveFixture({ "ss-31:50mg": { lot: { pending: true } } });
    live.mockResolvedValue({ all: shown, shown, lots: [], certificates: [] });
    const { container } = await renderSlug("ss-31");
    const vial = () => within(container.querySelector(".s-pdp-vial") as HTMLElement).getByRole("img", { name: /vial$/ });
    const code = () => container.querySelector(".s-pdp-scan svg path")!.getAttribute("d");
    expect(vial()).toHaveAccessibleName(/10 mg vial$/);
    const firstCode = code();
    fireEvent.click(screen.getByRole("button", { name: "50 mg" }));
    expect(vial()).toHaveAccessibleName(/50 mg vial$/);
    expect(code()).not.toBe(firstCode); // 50 mg has no lot yet: the lookup's code
    fireEvent.click(screen.getByRole("button", { name: "10 mg" }));
    expect(code()).toBe(firstCode);
  });

  it("before a first lot the scan code opens the certificate lookup", async () => {
    const pending = { lot: { pending: true as const } };
    const shown = liveFixture(Object.fromEntries(liveFixture().find((c) => c.slug === "bpc-157")!.variants.map((v) => [`bpc-157:${v.id}`, pending])));
    live.mockResolvedValue({ all: shown, shown, lots: [], certificates: [] });
    const { container } = await renderSlug("bpc-157");
    expect(container.querySelector(".s-pdp-scan")).not.toBeNull();
  });

  it("a single compound's placard has no Contains row", async () => {
    const { container } = await renderSlug("bpc-157");
    expect(container.querySelector(".s-pdp-placard")!.textContent).not.toContain("Contains");
  });

  it("buy panel holds the pack choice, Add to cart and shipping line; it comes first (phones), desktop puts the proof above it", async () => {
    const { container } = await renderSlug("bpc-157");
    const buy = container.querySelector(".s-buy")!;
    expect(buy.querySelector(".s-atc")).not.toBeNull();
    expect(buy.querySelector(".s-ship")?.textContent).toContain("Ships from the US");
    // page order = the phone order (mock Q1): name, buy box, then specs, trust row
    const pick = buy.parentElement!;
    expect(pick).toHaveClass("s-pick");
    expect([...pick.children].map((e) => e.className.split(" ")[0])).toEqual(["s-buy", "s-pick-notes", "s-specs", "s-trust"]);
    // the research-use line, disclaimer and Cancellations & claims sit right under the buy box
    const notes = pick.querySelector(".s-pick-notes")!;
    expect(notes.querySelector(".s-ruo")).toHaveTextContent("For research use only · Not for human consumption · 21+");
    expect(notes).toHaveTextContent("All products currently listed on this site are for research purposes only.");
    expect(notes.querySelector(".s-before")).not.toBeNull();
    expect(container.querySelector(".s-pdp-h1")!.compareDocumentPosition(buy) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // desktop: CSS order puts the spec boxes above the buy box, then the notes, then the stamps
    const css = readFileSync("src/app/globals.css", "utf8");
    const order = (sel: string) => Number(new RegExp(`\\.s-pick > \\.${sel} \\{ order: (\\d)`).exec(css)?.[1]);
    expect(order("s-specs")).toBeLessThan(order("s-buy"));
    expect(order("s-pick-notes")).toBeGreaterThan(order("s-buy"));
    expect(order("s-trust")).toBeGreaterThan(order("s-pick-notes"));
  });

  it("About band shows the description, caption, legend and source link", async () => {
    await renderSlug("bpc-157");
    const band = screen.getByRole("heading", { name: "About this compound" }).closest("section")!;
    expect(within(band).getByText(/synthetic pentadecapeptide/)).toBeInTheDocument();
    expect(within(band).getByText("Computed model — one of many shapes this molecule can take.")).toBeInTheDocument();
    expect(within(band).getByText("Carbon")).toBeInTheDocument();
    expect(within(band).getByRole("link", { name: /PubChem CID 9941957/ })).toHaveAttribute("href", "https://pubchem.ncbi.nlm.nih.gov/compound/9941957");
    expect(within(band).getAllByTestId("mol")).toHaveLength(1);
  });

  it("blends show one full-size model with a button per component and say the parts aren't bonded", async () => {
    await renderSlug("bpc-157-tb-500-ghk-cu-kpv");
    expect(screen.getAllByTestId("mol").map((m) => m.textContent)).toEqual(["BPC-157"]);
    for (const name of ["BPC-157", "TB-500", "GHK-Cu", "KPV"]) expect(screen.getByRole("button", { name })).toBeInTheDocument();
    expect(screen.getByText(/separate molecules, not bonded/)).toBeInTheDocument();
    // pubchem-3d and computed panels share a caption; it appears once.
    expect(screen.getAllByText("Computed model — one of many shapes this molecule can take.")).toHaveLength(1);
  });

  it("GHK-Cu cites the crystal-structure paper and shows copper in the legend", async () => {
    await renderSlug("ghk-cu");
    expect(screen.getByText("Modeled from the published crystal structure (1984).")).toBeInTheDocument();
    expect(screen.getByText("Copper")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /crystal structure paper/i })).toHaveAttribute("href", expect.stringContaining("sciencedirect.com"));
  });

  it("lists cancellations and claims, in line with the refund and shipping policies", async () => {
    const { container } = await renderSlug("bpc-157");
    const box = container.querySelector(".s-pick-notes .s-before")!;
    expect(container.querySelector(".s-media .s-before")).toBeNull();
    const items = within(box as HTMLElement).getAllByRole("listitem").map((li) => li.textContent);
    expect(box.querySelector("h3")).toHaveTextContent("Cancellations & claims");
    expect(items).toHaveLength(2);
    expect(items[0]).toMatch(/full refund until your order ships/i);
    expect(items[0]).toMatch(/sale is final/i);
    expect(items[1]).toMatch(/within 48 hours of delivery/i);
    expect(items[1]).toMatch(/wrong item\? we send the correct one/i);
    expect(items[1]).toMatch(/damaged in transit\? covered when your order has shipping protection/i);
  });
});
