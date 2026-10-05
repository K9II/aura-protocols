import { describe, it, expect, beforeEach } from "vitest";
import { liveFixture } from "../../helpers/live-catalog";
import { render, screen, fireEvent } from "@testing-library/react";
import { CartProvider, useCart, CART_STORAGE_KEY, CART_CODE_KEY } from "@/components/store/CartProvider";
import ClearCart from "@/components/account/ClearCart";

function Probe() {
  const { lines, add, totals, open } = useCart();
  return (
    <div>
      <span data-testid="count">{totals.itemCount}</span>
      <span data-testid="open">{String(open)}</span>
      <span data-testid="lines">{lines.length}</span>
      <button onClick={() => add({ slug: "bpc-157", variantId: "10mg", packQty: 1, quantity: 1 })}>add</button>
    </div>
  );
}

describe("CartProvider", () => {
  beforeEach(() => window.localStorage.clear());

  it("adds a line, opens the drawer and persists to localStorage", () => {
    render(<CartProvider catalog={liveFixture()}><Probe /></CartProvider>);
    fireEvent.click(screen.getByText("add"));
    expect(screen.getByTestId("count")).toHaveTextContent("1");
    expect(screen.getByTestId("open")).toHaveTextContent("true");
    expect(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? "[]")).toHaveLength(1);
  });

  it("restores lines from localStorage and drops unknown compounds", () => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([
      { slug: "bpc-157", variantId: "10mg", packQty: 2, quantity: 2 },
      { slug: "discontinued", variantId: "x", packQty: 2, quantity: 1 },
    ]));
    render(<CartProvider catalog={liveFixture()}><Probe /></CartProvider>);
    expect(screen.getByTestId("lines")).toHaveTextContent("1");
  });

  it("a child that clears on mount empties a stored cart (order confirmation page)", () => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([
      { slug: "bpc-157", variantId: "10mg", packQty: 1, quantity: 1 },
    ]));
    render(<CartProvider catalog={liveFixture()}><ClearCart /><Probe /></CartProvider>);
    expect(screen.getByTestId("lines")).toHaveTextContent("0");
    expect(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? "[]")).toHaveLength(0);
  });

  it("survives corrupted storage", () => {
    window.localStorage.setItem(CART_STORAGE_KEY, "{not json");
    render(<CartProvider catalog={liveFixture()}><Probe /></CartProvider>);
    expect(screen.getByTestId("lines")).toHaveTextContent("0");
  });

  it("drops saved cart lines whose pack size is no longer offered", () => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([
      { slug: "bpc-157", variantId: "10mg", packQty: 1, quantity: 1 },
      { slug: "bpc-157", variantId: "10mg", packQty: 3, quantity: 1 },
      { slug: "bpc-157", variantId: "10mg", packQty: 2, quantity: 1 },
    ]));
    render(<CartProvider catalog={liveFixture()}><LinesProbe /></CartProvider>);
    expect(screen.getByTestId("lines-detail").textContent).toBe("bpc-157:2");
  });

  it("keeps a discount code across visits and empties it with the cart", async () => {
    window.localStorage.clear();
    function CodeProbe() {
      const { code, setCode, clear } = useCart();
      return <div><span data-testid="code">{code}</span><button onClick={() => setCode("SMITHLAB")}>set</button><button onClick={clear}>clear</button></div>;
    }
    const { unmount } = render(<CartProvider catalog={liveFixture()}><CodeProbe /></CartProvider>);
    fireEvent.click(screen.getByText("set"));
    expect(window.localStorage.getItem(CART_CODE_KEY)).toBe("SMITHLAB");
    unmount();
    render(<CartProvider catalog={liveFixture()}><CodeProbe /></CartProvider>);
    expect(await screen.findByText("SMITHLAB")).toBeInTheDocument();
    fireEvent.click(screen.getByText("clear"));
    expect(screen.getByTestId("code").textContent).toBe("");
    expect(window.localStorage.getItem(CART_CODE_KEY)).toBeNull();
  });
});

// Named separately from Probe (above), which already uses data-testid="lines"
// for the line COUNT — this one needs the pack qty of each surviving line.
function LinesProbe() {
  const { lines } = useCart();
  return <div data-testid="lines-detail">{lines.map((l) => `${l.slug}:${l.packQty}`).join(",")}</div>;
}
