import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, within, fireEvent, act } from "@testing-library/react";
import LotRecord from "@/components/store/LotRecord";
import { setLotNews } from "@/lib/lot-news";
import type { RecordLot } from "@/lib/lot-record";

const NOW = Date.parse("2026-10-10T12:00:00Z");
const mk = (lot: string, compound: string, liveAt: string, status: RecordLot["status"] = "live"): RecordLot => ({
  lot, slug: "x", compound, strength: "10 mg", purityPct: 99.4, method: "HPLC+MS", testedOn: liveAt.slice(0, 10),
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

  it("product: lot table lists every lot with its status; one lot shows the first-lot note", () => {
    const { unmount } = render(<LotRecord lots={LOTS} variant="product" nowMs={NOW} compoundName="Semax" />);
    const rows = document.querySelectorAll(".s-rec-table tbody tr");
    expect([...rows].map((r) => r.textContent)).toEqual(["SX10-2610-0110 mg99.4%8 OctIn stock", "BP10-2609-0110 mg99.4%11 SepSold out"]);
    expect(document.querySelector(".s-rec-first")).toBeNull();
    unmount();
    render(<LotRecord lots={LOTS.slice(0, 1)} variant="product" nowMs={NOW} compoundName="Semax" />);
    expect(screen.getByText(/Semax's first lot/)).toBeInTheDocument();
  });
});
