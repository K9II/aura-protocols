import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CartProvider, useCart, CART_STORAGE_KEY } from "@/components/store/CartProvider";
import ClearCart from "@/components/account/ClearCart";

function Probe() {
  const { lines, add, totals, open } = useCart();
  return (
    <div>
      <span data-testid="count">{totals.itemCount}</span>
      <span data-testid="open">{String(open)}</span>
      <span data-testid="lines">{lines.length}</span>
      <button onClick={() => add({ slug: "bpc-157", variantId: "5mg", packQty: 1, quantity: 1 })}>add</button>
    </div>
  );
}

describe("CartProvider", () => {
  beforeEach(() => window.localStorage.clear());

  it("adds a line, opens the drawer and persists to localStorage", () => {
    render(<CartProvider><Probe /></CartProvider>);
    fireEvent.click(screen.getByText("add"));
    expect(screen.getByTestId("count")).toHaveTextContent("1");
    expect(screen.getByTestId("open")).toHaveTextContent("true");
    expect(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? "[]")).toHaveLength(1);
  });

  it("restores lines from localStorage and drops unknown compounds", () => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([
      { slug: "bpc-157", variantId: "5mg", packQty: 1, quantity: 2 },
      { slug: "discontinued", variantId: "x", packQty: 1, quantity: 1 },
    ]));
    render(<CartProvider><Probe /></CartProvider>);
    expect(screen.getByTestId("lines")).toHaveTextContent("1");
  });

  it("a child that clears on mount empties a stored cart (order confirmation page)", () => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([
      { slug: "bpc-157", variantId: "5mg", packQty: 1, quantity: 1 },
    ]));
    render(<CartProvider><ClearCart /><Probe /></CartProvider>);
    expect(screen.getByTestId("lines")).toHaveTextContent("0");
    expect(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? "[]")).toHaveLength(0);
  });

  it("survives corrupted storage", () => {
    window.localStorage.setItem(CART_STORAGE_KEY, "{not json");
    render(<CartProvider><Probe /></CartProvider>);
    expect(screen.getByTestId("lines")).toHaveTextContent("0");
  });
});
