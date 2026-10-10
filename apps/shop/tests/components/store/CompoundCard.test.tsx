import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CompoundCard from "@/components/store/CompoundCard";
import SpecBoxes from "@/components/store/SpecBoxes";
import type { Compound } from "@/data/catalog";

const lot = { lot: "AP-0001", purityPct: 99.6, method: "HPLC" as const, testedOn: "2026-09-01", coaFile: "/coa/AP-0001.pdf" };
const c: Compound = {
  slug: "bpc-157", name: "BPC-157", chemicalClass: "Peptide Fragments", identity: { cas: "137525-51-0", formula: "C62H98N16O22" },
  form: "x", storage: "x", vialMl: 3,
  variants: [{ id: "5mg", strength: "5 mg", shown: true, priceUsd: 49, stock: "in", lot, wholesale: true }, { id: "10mg", strength: "10 mg", shown: true, priceUsd: 79, stock: "in", lot, wholesale: true }],
  packDiscounts: [{ qty: 2, pct: 5 }, { qty: 5, pct: 10 }, { qty: 10, pct: 20 }],
};

describe("CompoundCard", () => {
  it("links to the product and shows class, from-price, purity and the COA tag", () => {
    render(<CompoundCard compound={c} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/products/bpc-157");
    expect(screen.getByText("Peptide Fragments")).toBeInTheDocument();
    expect(screen.getByText("from $93.10")).toBeInTheDocument();
    expect(screen.getByText("99.6% · tested")).toBeInTheDocument();
    expect(document.querySelector(".s-coa-tag")?.textContent).toBe("◇ COA on file");
  });

  it("shows the monograph placard with the CAS number, and Price / Certificate labels", () => {
    render(<CompoundCard compound={c} />);
    expect(screen.getByText("CAS 137525-51-0")).toBeInTheDocument();
    expect(screen.getByText("Monograph · Peptide Fragments")).toBeInTheDocument();
    expect(screen.getByText("Price")).toBeInTheDocument();
    expect(screen.getByText("Certificate")).toBeInTheDocument();
  });

  it("falls back to the formula when there is no CAS number", () => {
    render(<CompoundCard compound={{ ...c, identity: { formula: "C62H98N16O22" } }} />);
    expect(screen.getByText("C62H98N16O22")).toBeInTheDocument();
  });

  it("colours the card with its chemical class", () => {
    render(<CompoundCard compound={c} />);
    expect(screen.getByRole("link").getAttribute("style")).toContain("--cls: #A32B1F");
  });

  it("shows a plain price when there is one variant", () => {
    render(<CompoundCard compound={{ ...c, variants: [c.variants[0]] }} />);
    expect(screen.getByText("from $93.10")).toBeInTheDocument();
  });

  it("shows COA pending instead of the tag and purity", () => {
    render(<CompoundCard compound={{ ...c, variants: c.variants.map((v) => ({ ...v, stock: "out" as const, lot: { pending: true as const } })) }} />);
    expect(screen.getByText("COA pending")).toBeInTheDocument();
    expect(document.querySelector(".s-coa-tag")).toBeNull();
  });

  it("takes the lot line from the first strength with a released lot", () => {
    render(<CompoundCard compound={{ ...c, variants: [{ ...c.variants[0], stock: "out", lot: { pending: true } }, c.variants[1]] }} />);
    expect(screen.getByText("99.6% · tested")).toBeInTheDocument();
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
    render(<SpecBoxes lot={lot} />);
    expect(screen.getByText("99.6%")).toBeInTheDocument();
    expect(screen.getByText("HPLC")).toBeInTheDocument();
    expect(screen.getByText("AP-0001")).toBeInTheDocument();
  });

  it("shows Pending for every box when the lot is pending", () => {
    render(<SpecBoxes lot={{ pending: true }} />);
    expect(screen.getAllByText("Pending")).toHaveLength(3);
  });
});
