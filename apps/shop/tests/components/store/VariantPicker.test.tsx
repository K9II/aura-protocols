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
    fireEvent.click(screen.getByRole("button", { name: /2-pack/ }));
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

  it("offers 2-, 5- and 10-packs with their discounts and no single vial", () => {
    render(<CartProvider><VariantPicker compound={bpc} /></CartProvider>);
    expect(screen.queryByRole("button", { name: /single/i })).toBeNull();
    expect(screen.getByRole("button", { name: "2-pack −5%" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "5-pack −10%" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "10-pack −20%" })).toBeInTheDocument();
  });

  it("shows the per-vial price for the selected pack and the pack total on the button", () => {
    render(<CartProvider><VariantPicker compound={bpc} /></CartProvider>);
    expect(screen.getByText(/\$75\.05/)).toBeInTheDocument();             // 79 × 0.95
    expect(screen.getByRole("button", { name: /add to cart — \$150\.10/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "10-pack −20%" }));
    expect(screen.getByText(/\$63\.20/)).toBeInTheDocument();             // 79 × 0.80
    expect(screen.getByRole("button", { name: /add to cart — \$632\.00/i })).toBeInTheDocument();
  });
});
