import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CompoundCard from "@/components/store/CompoundCard";
import SpecBoxes from "@/components/store/SpecBoxes";
import type { Compound } from "@/data/catalog";

const c: Compound = {
  slug: "bpc-157", name: "BPC-157", chemicalClass: "Peptide Fragments", identity: {},
  form: "x", storage: "x", vialMl: 3,
  variants: [{ id: "5mg", strength: "5 mg", priceUsd: 49, stock: "in" }, { id: "10mg", strength: "10 mg", priceUsd: 79, stock: "in" }],
  packDiscounts: [{ qty: 1, pct: 0 }],
  currentLot: { lot: "AP-0001", purityPct: 99.6, method: "HPLC", testedOn: "2026-09-01", coaFile: "/coa/AP-0001.pdf" },
};

describe("CompoundCard", () => {
  it("links to the product and shows class, from-price, purity and the COA tag", () => {
    render(<CompoundCard compound={c} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/products/bpc-157");
    expect(screen.getByText("Peptide Fragments")).toBeInTheDocument();
    expect(screen.getByText("from $49")).toBeInTheDocument();
    expect(screen.getByText("99.6% · tested")).toBeInTheDocument();
    expect(screen.getByText("◇ COA on file")).toBeInTheDocument();
  });

  it("shows a plain price when there is one variant", () => {
    render(<CompoundCard compound={{ ...c, variants: [c.variants[0]] }} />);
    expect(screen.getByText("$49")).toBeInTheDocument();
  });

  it("shows COA pending instead of the tag and purity", () => {
    render(<CompoundCard compound={{ ...c, currentLot: { pending: true } }} />);
    expect(screen.getByText("COA pending")).toBeInTheDocument();
    expect(screen.queryByText("◇ COA on file")).toBeNull();
  });

  it("flags low stock, and out of stock when every variant is out", () => {
    const { rerender } = render(<CompoundCard compound={{ ...c, variants: [{ ...c.variants[0], stock: "low" }] }} />);
    expect(screen.getByText("Low stock")).toBeInTheDocument();
    rerender(<CompoundCard compound={{ ...c, variants: [{ ...c.variants[0], stock: "out" }] }} />);
    expect(screen.getByText("Out of stock")).toBeInTheDocument();
  });
});

describe("SpecBoxes", () => {
  it("shows purity, method and lot", () => {
    render(<SpecBoxes lot={c.currentLot} />);
    expect(screen.getByText("99.6%")).toBeInTheDocument();
    expect(screen.getByText("HPLC")).toBeInTheDocument();
    expect(screen.getByText("AP-0001")).toBeInTheDocument();
  });

  it("shows Pending for every box when the lot is pending", () => {
    render(<SpecBoxes lot={{ pending: true }} />);
    expect(screen.getAllByText("Pending")).toHaveLength(3);
  });
});
