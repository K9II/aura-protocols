import { describe, it, expect } from "vitest";
import { liveFixture, LOT } from "../../helpers/live-catalog";
import { render, screen, fireEvent } from "@testing-library/react";
import { CartProvider, useCart } from "@/components/store/CartProvider";
import VariantPicker from "@/components/store/VariantPicker";

// Live fixture: every strength $79, in stock, with LOT. SS-31 is the product
// that has two sizes (10 mg / 50 mg); its 50 mg sells from its own lot.
const LOT_50 = { lot: "SS-2609-02", purityPct: 98.7, method: "HPLC" as const, testedOn: "2026-09-20", coaFile: "https://x/coa/SS-2609-02/1.pdf" };
const compounds = liveFixture({ "ss-31:50mg": { priceUsd: 249, lot: LOT_50, stock: "low" as const } });
const bpc = compounds.find((c) => c.slug === "bpc-157")!;
const ss31 = compounds.find((c) => c.slug === "ss-31")!;

function Lines() {
  const { lines } = useCart();
  return <pre data-testid="lines">{JSON.stringify(lines)}</pre>;
}

describe("VariantPicker", () => {
  it("prices the selected size and pack and adds the exact line", () => {
    render(<CartProvider catalog={liveFixture()}><VariantPicker compound={ss31} /><Lines /></CartProvider>);
    fireEvent.click(screen.getByRole("button", { name: "50 mg" }));
    fireEvent.click(screen.getByRole("button", { name: /^2 vials × 50 mg/ }));
    const v = ss31.variants.find((x) => x.id === "50mg")!;
    const expected = Math.round(v.priceUsd * 2 * 0.95 * 100) / 100;
    const atc = screen.getByRole("button", { name: new RegExp(`Add to cart — \\$${expected.toFixed(2)}`) });
    fireEvent.click(atc);
    expect(JSON.parse(screen.getByTestId("lines").textContent!)).toEqual([
      { slug: "ss-31", variantId: "50mg", packQty: 2, quantity: 1 },
    ]);
  });

  it("disables add-to-cart for an out-of-stock size and for a pending lot", () => {
    const out = { ...bpc, variants: bpc.variants.map((v) => ({ ...v, stock: "out" as const })) };
    const { rerender } = render(<CartProvider catalog={liveFixture()}><VariantPicker compound={out} /></CartProvider>);
    expect(screen.getByRole("button", { name: /out of stock/i })).toBeDisabled();
    const pending = { ...bpc, variants: bpc.variants.map((v) => ({ ...v, stock: "out" as const, lot: { pending: true as const } })) };
    rerender(<CartProvider catalog={liveFixture()}><VariantPicker compound={pending} /></CartProvider>);
    expect(screen.getByRole("button", { name: /coa pending/i })).toBeDisabled();
    expect(screen.getByText(/certificate posted when lab results return/i)).toBeInTheDocument();
  });

  it("shows the selected strength's lot and certificate", () => {
    render(<CartProvider catalog={liveFixture()}><VariantPicker compound={ss31} /></CartProvider>);
    expect(screen.getByText(LOT.lot)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view this lot's certificate/i })).toHaveAttribute("href", LOT.coaFile);
    fireEvent.click(screen.getByRole("button", { name: "50 mg" }));
    expect(screen.getByText(LOT_50.lot)).toBeInTheDocument();
    expect(screen.getByText("98.7%")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view this lot's certificate/i })).toHaveAttribute("href", LOT_50.coaFile);
  });

  it("shows the selected strength's stock label and switches it with the strength", () => {
    render(<CartProvider catalog={liveFixture()}><VariantPicker compound={ss31} /></CartProvider>);
    expect(screen.getByText("In stock")).toBeInTheDocument();
    expect(screen.queryByText("Low stock")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "50 mg" }));
    expect(screen.getByText("Low stock")).toBeInTheDocument();
    expect(screen.queryByText("In stock")).toBeNull();
  });

  it("does not show a stock label for a pending lot (the COA-pending copy covers it)", () => {
    const pending = { ...bpc, variants: bpc.variants.map((v) => ({ ...v, stock: "out" as const, lot: { pending: true as const } })) };
    render(<CartProvider catalog={liveFixture()}><VariantPicker compound={pending} /></CartProvider>);
    expect(screen.queryByText("Out of stock")).toBeNull();
    expect(screen.getByText(/certificate posted when lab results return/i)).toBeInTheDocument();
  });

  it("lists 2-, 5- and 10-packs with mg, $/mg, pack price and discount, and no single vial", () => {
    render(<CartProvider catalog={liveFixture()}><VariantPicker compound={bpc} /></CartProvider>);
    expect(screen.queryByRole("button", { name: /single/i })).toBeNull();
    const two = screen.getByRole("button", { name: /^2 vials × 10 mg/ });
    expect(two).toHaveAttribute("aria-pressed", "true");
    expect(two).toHaveTextContent("20 mg total · $7.51/mg");
    expect(two).toHaveTextContent("$150.10");
    expect(two).toHaveTextContent(/save 5%/i);
    expect(screen.getByRole("button", { name: /^5 vials × 10 mg/ })).toHaveTextContent("$355.50");
    expect(screen.getByRole("button", { name: /^10 vials × 10 mg/ })).toHaveTextContent("$671.50");
  });

  it("shows the selected pack's price large, with per-vial and per-mg, and the total on the button", () => {
    render(<CartProvider catalog={liveFixture()}><VariantPicker compound={bpc} /></CartProvider>);
    const sel = screen.getByTestId("selected-pack");
    expect(sel).toHaveTextContent("20 mg pack");
    expect(sel).toHaveTextContent("$75.05/vial");              // 79 × 0.95
    expect(sel).toHaveTextContent("$7.51/mg");
    expect(sel).toHaveTextContent("$150.10");
    expect(screen.getByRole("button", { name: /add to cart — \$150\.10/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^10 vials × 10 mg/ }));
    expect(screen.getByRole("button", { name: /^10 vials × 10 mg/ })).toHaveAttribute("aria-pressed", "true");
    expect(sel).toHaveTextContent("100 mg pack");
    expect(sel).toHaveTextContent("$67.15/vial");              // 79 × 0.85
    expect(screen.getByRole("button", { name: /add to cart — \$671\.50/i })).toBeInTheDocument();
  });

  it("prices an IU strength per IU", () => {
    const iu = { ...bpc, variants: [{ ...bpc.variants[0], id: "5000iu", strength: "5000 IU", priceUsd: 400 }] };
    render(<CartProvider catalog={[iu]}><VariantPicker compound={iu} /></CartProvider>);
    const two = screen.getByRole("button", { name: /^2 vials × 5000 IU/ });
    expect(two).toHaveTextContent("10000 IU total · $0.08/IU");
    const sel = screen.getByTestId("selected-pack");
    expect(sel).toHaveTextContent("$380.00/vial · $0.08/IU");
    expect(sel).not.toHaveTextContent("/mg");
  });

  it("adds the chosen number of packs and shows the running total", () => {
    window.localStorage.clear();
    render(<CartProvider catalog={liveFixture()}><VariantPicker compound={bpc} /><Lines /></CartProvider>);
    const minus = screen.getByRole("button", { name: "Decrease quantity" });
    const plus = screen.getByRole("button", { name: "Increase quantity" });
    expect(minus).toBeDisabled();
    fireEvent.click(plus);
    fireEvent.click(plus);
    expect(screen.getByRole("group", { name: "Quantity" })).toHaveTextContent("3");
    const atc = screen.getByRole("button", { name: /add to cart — \$450\.30/i });   // 3 × 2-pack at $79 × 0.95
    fireEvent.click(atc);
    expect(JSON.parse(screen.getByTestId("lines").textContent!)).toEqual([
      { slug: "bpc-157", variantId: "10mg", packQty: 2, quantity: 3 },
    ]);
    fireEvent.click(minus);
    expect(screen.getByRole("group", { name: "Quantity" })).toHaveTextContent("2");
  });

  it("caps the quantity at 20 packs", () => {
    render(<CartProvider catalog={liveFixture()}><VariantPicker compound={bpc} /></CartProvider>);
    const plus = screen.getByRole("button", { name: "Increase quantity" });
    for (let i = 0; i < 25; i++) fireEvent.click(plus);
    expect(screen.getByRole("group", { name: "Quantity" })).toHaveTextContent("20");
    expect(plus).toBeDisabled();
  });
});
