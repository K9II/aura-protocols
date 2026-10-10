import { describe, it, expect, vi, beforeEach } from "vitest";
import { liveFixture } from "../../helpers/live-catalog";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { CartProvider, useCart } from "@/components/store/CartProvider";
import SiteNav from "@/components/store/SiteNav";
import { FREE_SHIPPING_THRESHOLD_USD } from "@/lib/cart";

vi.mock("@/components/store/AuthLinks", () => ({ default: () => <a href="/sign-in">Sign in</a> }));
let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

function Adder() {
  const { add } = useCart();
  return <button onClick={() => add({ slug: "bpc-157", variantId: "10mg", packQty: 2, quantity: 2 })}>add</button>;
}

describe("SiteNav", () => {
  beforeEach(() => { window.localStorage.clear(); pathname = "/"; });

  it("renders nothing inside the admin command center", () => {
    pathname = "/admin/discounts";
    const { container } = render(<CartProvider catalog={liveFixture()}><SiteNav /></CartProvider>);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows Shop, the store links and a live cart count", () => {
    render(<CartProvider catalog={liveFixture()}><SiteNav /><Adder /></CartProvider>);
    const links = screen.getByRole("navigation", { name: "Main" }).children[1] as HTMLElement;
    expect(within(links).getByRole("link", { name: "Shop" })).toHaveAttribute("href", "/products");
    expect(screen.getByRole("link", { name: "COA Lookup" })).toHaveAttribute("href", "/coa");
    expect(screen.getByRole("link", { name: "Wholesale" })).toHaveAttribute("href", "/wholesale");
    expect(screen.getByRole("link", { name: "Affiliate Program" })).toHaveAttribute("href", "/affiliates");
    expect(screen.getByRole("button", { name: /cart \(0\)/i })).toBeInTheDocument();
    fireEvent.click(screen.getByText("add"));
    expect(screen.getByRole("button", { name: /cart \(2\)/i })).toBeInTheDocument();
  });

  it("highlights the Cart link once something is in the cart", () => {
    render(<CartProvider catalog={liveFixture()}><SiteNav /><Adder /></CartProvider>);
    expect(screen.getByRole("button", { name: /cart \(0\)/i })).not.toHaveClass("s-nav-cart-full");
    fireEvent.click(screen.getByText("add"));
    expect(screen.getByRole("button", { name: /cart \(2\)/i })).toHaveClass("s-nav-cart-full");
  });

  it("puts the logo at the left edge, links in the middle, account and Cart on the right", () => {
    render(<CartProvider catalog={liveFixture()}><SiteNav /></CartProvider>);
    const nav = screen.getByRole("navigation", { name: "Main" });
    const logo = screen.getByRole("link", { name: "Aura Protocols home" });
    expect(logo).toHaveAttribute("href", "/");
    const order = [...nav.children].map((el) => el.className);
    expect(order).toEqual(["s-nav-logo", "s-nav-links", "s-nav-actions"]);
    expect(nav.children[0]).toContainElement(logo);
    const actions = nav.children[2] as HTMLElement;
    expect(within(actions).queryByRole("link", { name: "Shop" })).toBeNull();
    expect(actions).toContainElement(screen.getByRole("button", { name: /cart/i }));
  });

  it("puts Shop first in the links row, ahead of COA Lookup; sign-in then Cart on the right", () => {
    render(<CartProvider catalog={liveFixture()}><SiteNav /></CartProvider>);
    const actions = screen.getByRole("navigation", { name: "Main" }).children[2] as HTMLElement;
    const labels = [...actions.querySelectorAll("a, button")].map((el) => el.textContent);
    expect(labels).toEqual(["Sign in", "Cart (0)"]);
    const links = screen.getByRole("navigation", { name: "Main" }).children[1] as HTMLElement;
    expect([...links.querySelectorAll("a")].map((a) => a.textContent)).toEqual(["Shop", "COA Lookup", "Wholesale", "Affiliate Program"]);
  });

  it("shows the banner: ISO/IEC 17025-accredited US lab, COA on every lot, fast domestic shipping, free-shipping threshold", () => {
    render(<CartProvider catalog={liveFixture()}><SiteNav /></CartProvider>);
    const bar = document.querySelector(".s-topbar .s-topbar-wide") as HTMLElement;
    expect(bar.textContent?.replace(/\s+/g, " ").trim()).toBe(
      `Tested by an ISO/IEC 17025-accredited US lab · COA on every lot · Fast domestic shipping · Free over $${FREE_SHIPPING_THRESHOLD_USD}`,
    );
    expect(within(bar).getByText("Fast domestic shipping").tagName).toBe("EM");
  });

  it("phones get the short banner wording", () => {
    render(<CartProvider catalog={liveFixture()}><SiteNav /></CartProvider>);
    const phone = document.querySelector(".s-topbar .s-topbar-phone") as HTMLElement;
    expect(phone.textContent?.replace(/\s+/g, " ").trim()).toBe(
      `Accredited US lab · COA every lot · Free shipping over $${FREE_SHIPPING_THRESHOLD_USD}`,
    );
  });
});
