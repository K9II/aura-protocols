import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, within, fireEvent, act } from "@testing-library/react";
import LotRecord from "@/components/store/LotRecord";
import { setLotNews } from "@/lib/lot-news";
import type { RecordLot } from "@/lib/lot-record";
import { chooseStrength, forgetStrength } from "@/lib/chosen-strength";

const NOW = Date.parse("2026-10-10T12:00:00Z");
const mk = (lot: string, compound: string, liveAt: string, status: RecordLot["status"] = "live"): RecordLot => ({
  lot, slug: "x", variantId: "10mg", compound, strength: "10 mg", purityPct: 99.4, method: "HPLC+MS", testedOn: liveAt.slice(0, 10),
  liveAt, coaFile: `https://coa/${lot}.pdf`, status,
});
const LOTS = [mk("SX10-2610-01", "Semax", "2026-10-08T16:00:00Z"), mk("BP10-2609-01", "BPC-157", "2026-09-11T16:00:00Z", "sold_out")];

describe("LotRecord", () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
  afterEach(() => act(() => setLotNews(null)));

  it("renders nothing before the first lot is released", () => {
    const { container } = render(<LotRecord lots={[]} variant="home" nowMs={NOW} />);
    expect(container.innerHTML).toBe("");
  });

  it("detail strip shows the selected lot and links its certificate; clicking a label selects it", () => {
    render(<LotRecord lots={LOTS} variant="home" nowMs={NOW} />);
    const detail = document.querySelector(".s-rec-detail") as HTMLElement;
    expect(within(detail).getByText("SX10-2610-01")).toBeInTheDocument();
    expect(within(detail).getByRole("link", { name: /certificate/ })).toHaveAttribute("href", "https://coa/SX10-2610-01.pdf");
    fireEvent.click(screen.getByRole("button", { name: /lot BP10-2609-01/ }));
    expect(within(detail).getByText("BP10-2609-01")).toBeInTheDocument();
    expect(within(detail).getByText("Sold out")).toBeInTheDocument();
  });

  it("first visit: nothing marked new; returning visitor: later releases are New", () => {
    const { unmount } = render(<LotRecord lots={LOTS} variant="home" nowMs={NOW} />);
    expect(document.querySelectorAll(".s-rec-labels button.new")).toHaveLength(0);
    unmount();
    localStorage.setItem("aura_last_visit", "2026-10-01T00:00:00Z");
    sessionStorage.clear();
    render(<LotRecord lots={LOTS} variant="home" nowMs={NOW} />);
    const fresh = document.querySelectorAll(".s-rec-labels button.new");
    expect(fresh).toHaveLength(1);
    expect(fresh[0].getAttribute("aria-label")).toContain("lot SX10-2610-01");
  });

  it("product: no chart (LOT_CHART) — heading, lot details and the lot table only", () => {
    const { unmount } = render(<LotRecord lots={LOTS} variant="product" nowMs={NOW} compoundName="Semax" />);
    const rows = document.querySelectorAll(".s-rec-table tbody tr");
    expect([...rows].map((r) => r.textContent)).toEqual(["SX10-2610-0110 mg99.4%8 OctIn stock", "BP10-2609-0110 mg99.4%11 SepSold out"]);
    expect(document.querySelector(".s-rec")).toHaveClass("s-rec--nochart");
    expect(document.querySelector(".s-rec canvas, .s-rec-band, .s-rec-labels, .s-rec-cap")).toBeNull();
    expect(screen.queryByText(/tap a run/i)).toBeNull();
    expect(screen.getByRole("heading", { name: "Lot record" })).toBeInTheDocument();
    expect(document.querySelector(".s-rec-detail")).toHaveTextContent("SX10-2610-01");
    // product pages open certificates from the certificate cards only
    expect(screen.queryByRole("link", { name: /open this lot's certificate/i })).toBeNull();
    unmount();
    // the first-lot note described the chart ("joins the record here, in front"), so it goes with it
    render(<LotRecord lots={LOTS.slice(0, 1)} variant="product" nowMs={NOW} compoundName="Semax" />);
    expect(screen.queryByText(/The first Semax lot\./)).toBeNull();
  });

  it("home: keeps the chart and the certificate link", () => {
    render(<LotRecord lots={LOTS} variant="home" nowMs={NOW} />);
    expect(screen.getByRole("link", { name: /open this lot's certificate/i })).toBeInTheDocument();
    expect(document.querySelector(".s-rec canvas")).not.toBeNull();
    expect(document.querySelector(".s-rec")).not.toHaveClass("s-rec--nochart");
  });

  it("product: follows the size picker — the chosen strength's lot, or its certificate on the way", () => {
    const lots = [mk("MC10-01", "MOTS-c", "2026-10-08T16:00:00Z"), { ...mk("MC40-01", "MOTS-c", "2026-10-01T16:00:00Z"), variantId: "40mg", strength: "40 mg" }];
    const variants = [{ id: "10mg", strength: "10 mg", lot: "MC10-01" }, { id: "40mg", strength: "40 mg", lot: "MC40-01" }, { id: "80mg", strength: "80 mg", lot: null }];
    render(<LotRecord lots={lots} variant="product" nowMs={NOW} compoundName="MOTS-c" slug="mots-c" variants={variants} />);
    const box = () => document.querySelector(".s-rec-detail") as HTMLElement;
    expect(within(box()).getByText("MC10-01")).toBeInTheDocument();
    act(() => chooseStrength("mots-c", "40mg"));
    expect(within(box()).getByText("MC40-01")).toBeInTheDocument();
    act(() => chooseStrength("mots-c", "80mg"));
    expect(box()).toHaveTextContent("MOTS-c 80 mg");
    expect(box()).toHaveTextContent("Certificate posted when lab results return");
    act(() => forgetStrength("mots-c"));
  });

  it("product with no released lot yet still says its certificate is on the way", () => {
    render(<LotRecord lots={[]} variant="product" nowMs={NOW} compoundName="Eloralintide" slug="elo" variants={[{ id: "5mg", strength: "5 mg", lot: null }]} />);
    expect(document.querySelector(".s-rec-detail")).toHaveTextContent("Eloralintide 5 mg");
    expect(document.querySelector(".s-rec-detail")).toHaveTextContent("Certificate posted when lab results return");
  });
});
