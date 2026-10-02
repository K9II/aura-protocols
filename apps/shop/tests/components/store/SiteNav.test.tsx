import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { CartProvider, useCart } from "@/components/store/CartProvider";
import SiteNav from "@/components/store/SiteNav";
import { FREE_SHIPPING_THRESHOLD_USD } from "@/lib/cart";

vi.mock("@/components/store/AuthLinks", () => ({ default: () => <a href="/sign-in">Sign in</a> }));

function Adder() {
  const { add } = useCart();
  return <button onClick={() => add({ slug: "bpc-157", variantId: "10mg", packQty: 2, quantity: 2 })}>add</button>;
}

describe("SiteNav", () => {
  beforeEach(() => window.localStorage.clear());

  it("shows Shop, the store links and a live cart count", () => {
    render(<CartProvider><SiteNav /><Adder /></CartProvider>);
    const actions = screen.getByRole("navigation", { name: "Main" }).children[2] as HTMLElement;
    expect(within(actions).getByRole("link", { name: "Shop" })).toHaveAttribute("href", "/products");
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
    expect(actions).toContainElement(within(actions).getByRole("link", { name: "Shop" }));
    expect(actions).toContainElement(screen.getByRole("button", { name: /cart/i }));
  });

  it("places the sign-in control between Shop and Cart, and a phone Shop link in the links row", () => {
    render(<CartProvider><SiteNav /></CartProvider>);
    const actions = screen.getByRole("navigation", { name: "Main" }).children[2] as HTMLElement;
    const labels = [...actions.querySelectorAll("a, button")].map((el) => el.textContent);
    expect(labels).toEqual(["Shop", "Sign in", "Cart (0)"]);
    const links = screen.getByRole("navigation", { name: "Main" }).children[1] as HTMLElement;
    expect(links.querySelector("a.s-nav-shop-link")).toHaveAttribute("href", "/products");
  });

  it("shows the banner: lab-tested, COA on every lot, fast domestic shipping, free-shipping threshold", () => {
    render(<CartProvider><SiteNav /></CartProvider>);
    const bar = document.querySelector(".s-topbar") as HTMLElement;
    expect(bar.textContent?.replace(/\s+/g, " ").trim()).toBe(
      `Lab-tested · COA on every lot · Fast domestic shipping · Free over $${FREE_SHIPPING_THRESHOLD_USD}`,
    );
    expect(within(bar).getByText("Fast domestic shipping").tagName).toBe("EM");
  });
});
