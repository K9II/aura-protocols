import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CartProvider, useCart } from "@/components/store/CartProvider";
import VariantPicker from "@/components/store/VariantPicker";
import { compounds } from "@/data/catalog";

// Catalog lots are pending until sourcing; give the fixture a tested lot so
// add-to-cart is enabled.
const testedLot = { lot: "AP-TEST-1", purityPct: 99.4, method: "HPLC" as const, testedOn: "2026-09-01", coaFile: "/coa/AP-TEST-1.pdf" };
const bpc = { ...compounds.find((c) => c.slug === "bpc-157")!, currentLot: testedLot };
// SS-31 is the product that still has two sizes (10 mg / 50 mg).
const ss31 = { ...compounds.find((c) => c.slug === "ss-31")!, currentLot: testedLot };

function Lines() {
  const { lines } = useCart();
  return <pre data-testid="lines">{JSON.stringify(lines)}</pre>;
}

describe("VariantPicker", () => {
  it("prices the selected size and pack and adds the exact line", () => {
    render(<CartProvider><VariantPicker compound={ss31} /><Lines /></CartProvider>);
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
    const { rerender } = render(<CartProvider><VariantPicker compound={out} /></CartProvider>);
    expect(screen.getByRole("button", { name: /out of stock/i })).toBeDisabled();
    rerender(<CartProvider><VariantPicker compound={{ ...bpc, currentLot: { pending: true } }} /></CartProvider>);
    expect(screen.getByRole("button", { name: /coa pending/i })).toBeDisabled();
  });

  it("lists 2-, 5- and 10-packs with mg, $/mg, pack price and discount, and no single vial", () => {
    render(<CartProvider><VariantPicker compound={bpc} /></CartProvider>);
    expect(screen.queryByRole("button", { name: /single/i })).toBeNull();
    const two = screen.getByRole("button", { name: /^2 vials × 10 mg/ });
    expect(two).toHaveAttribute("aria-pressed", "true");
    expect(two).toHaveTextContent("20 mg total · $7.51/mg");
    expect(two).toHaveTextContent("$150.10");
    expect(two).toHaveTextContent(/save 5%/i);
    expect(screen.getByRole("button", { name: /^5 vials × 10 mg/ })).toHaveTextContent("$355.50");
    expect(screen.getByRole("button", { name: /^10 vials × 10 mg/ })).toHaveTextContent("$632.00");
  });

  it("shows the selected pack's price large, with per-vial and per-mg, and the total on the button", () => {
    render(<CartProvider><VariantPicker compound={bpc} /></CartProvider>);
    const sel = screen.getByTestId("selected-pack");
    expect(sel).toHaveTextContent("20 mg pack");
    expect(sel).toHaveTextContent("$75.05/vial");              // 79 × 0.95
    expect(sel).toHaveTextContent("$7.51/mg");
    expect(sel).toHaveTextContent("$150.10");
    expect(screen.getByRole("button", { name: /add to cart — \$150\.10/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^10 vials × 10 mg/ }));
    expect(screen.getByRole("button", { name: /^10 vials × 10 mg/ })).toHaveAttribute("aria-pressed", "true");
    expect(sel).toHaveTextContent("100 mg pack");
    expect(sel).toHaveTextContent("$63.20/vial");              // 79 × 0.80
    expect(screen.getByRole("button", { name: /add to cart — \$632\.00/i })).toBeInTheDocument();
  });

  it("adds the chosen number of packs and shows the running total", () => {
    window.localStorage.clear();
    render(<CartProvider><VariantPicker compound={bpc} /><Lines /></CartProvider>);
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
    render(<CartProvider><VariantPicker compound={bpc} /></CartProvider>);
    const plus = screen.getByRole("button", { name: "Increase quantity" });
    for (let i = 0; i < 25; i++) fireEvent.click(plus);
    expect(screen.getByRole("group", { name: "Quantity" })).toHaveTextContent("20");
    expect(plus).toBeDisabled();
  });
});
