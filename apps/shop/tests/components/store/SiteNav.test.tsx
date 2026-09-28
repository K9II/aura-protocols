import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CartProvider, useCart } from "@/components/store/CartProvider";
import SiteNav from "@/components/store/SiteNav";

function Adder() {
  const { add } = useCart();
  return <button onClick={() => add({ slug: "bpc-157", variantId: "5mg", packQty: 1, quantity: 2 })}>add</button>;
}

describe("SiteNav", () => {
  it("shows Shop, the store links and a live cart count", () => {
    render(<CartProvider><SiteNav /><Adder /></CartProvider>);
    expect(screen.getByRole("link", { name: "Shop" })).toHaveAttribute("href", "/products");
    expect(screen.getByRole("link", { name: "COA Lookup" })).toHaveAttribute("href", "/coa");
    expect(screen.getByRole("link", { name: "Wholesale" })).toHaveAttribute("href", "/wholesale");
    expect(screen.getByRole("link", { name: "Affiliates" })).toHaveAttribute("href", "/affiliates");
    expect(screen.getByRole("button", { name: /cart \(0\)/i })).toBeInTheDocument();
    fireEvent.click(screen.getByText("add"));
    expect(screen.getByRole("button", { name: /cart \(2\)/i })).toBeInTheDocument();
  });
});
