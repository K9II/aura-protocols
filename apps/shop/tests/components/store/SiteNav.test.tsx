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
    expect(screen.getByRole("link", { name: "Affiliate Program" })).toHaveAttribute("href", "/affiliates");
    expect(screen.getByRole("button", { name: /cart \(0\)/i })).toBeInTheDocument();
    fireEvent.click(screen.getByText("add"));
    expect(screen.getByRole("button", { name: /cart \(2\)/i })).toBeInTheDocument();
  });

  it("puts the logo at the left edge, links in the middle, Shop and Cart on the right", () => {
    render(<CartProvider><SiteNav /></CartProvider>);
    const nav = screen.getByRole("navigation", { name: "Main" });
    const logo = screen.getByRole("link", { name: "Aura Protocols home" });
    expect(logo).toHaveAttribute("href", "/");
    const order = [...nav.children].map((el) => el.className);
    expect(order).toEqual(["s-nav-logo", "s-nav-links", "s-nav-actions"]);
    expect(nav.children[0]).toContainElement(logo);
    const actions = nav.children[2] as HTMLElement;
    expect(actions).toContainElement(screen.getByRole("link", { name: "Shop" }));
    expect(actions).toContainElement(screen.getByRole("button", { name: /cart/i }));
  });
});
