import { describe, it, expect, vi, beforeEach } from "vitest";
import { liveFixture } from "../../helpers/live-catalog";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const { checkCodeAction } = vi.hoisted(() => ({ checkCodeAction: vi.fn() }));
vi.mock("@/app/checkout/actions", () => ({ checkCodeAction }));
// The live catalog comes in as the provider's `catalog` prop (liveFixture:
// every strength $79, in stock, with a tested lot).
import { CartProvider, CART_STORAGE_KEY, CART_CODE_KEY } from "@/components/store/CartProvider";
import CartView from "@/components/store/CartView";
import CartBackLink from "@/components/store/CartBackLink";

// BPC-157 10 mg is $79/vial: a 2-pack is $158 list, $150.10 at the pack's 5%;
// a partner code (10% off list) makes it $142.20, so the code saves $7.90.
const oneTwoPack = () => window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([{ slug: "bpc-157", variantId: "10mg", packQty: 2, quantity: 1 }]));

describe("CartView", () => {
  beforeEach(() => { window.localStorage.clear(); checkCodeAction.mockReset(); oneTwoPack(); });

  it("sends the shopper to /checkout", async () => {
    render(<CartProvider catalog={liveFixture()}><CartView /></CartProvider>);
    expect(await screen.findByRole("link", { name: /checkout/i })).toHaveAttribute("href", "/checkout");
  });

  it("cart page: a Continue shopping button goes back to the lineup", async () => {
    render(<CartProvider catalog={liveFixture()}><CartView /></CartProvider>);
    const btn = await screen.findByRole("link", { name: "Continue shopping" });
    expect(btn).toHaveAttribute("href", "/products");
    expect(btn).toHaveClass("p-btn-outline");
  });

  it("cart drawer: Continue shopping goes to the shop page too, and closes the drawer", async () => {
    const close = vi.fn();
    render(<CartProvider catalog={liveFixture()}><CartView onNavigate={close} /></CartProvider>);
    const btn = await screen.findByRole("link", { name: "Continue shopping" });
    expect(btn).toHaveAttribute("href", "/products");
    fireEvent.click(btn);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("applies a discount code in the cart and shows the saving", async () => {
    checkCodeAction.mockResolvedValue({ ok: true, kind: "partner", code: "SMITHLAB" });
    render(<CartProvider catalog={liveFixture()}><CartView /></CartProvider>);
    fireEvent.change(await screen.findByLabelText("Discount code"), { target: { value: "smithlab" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(await screen.findByText(/SMITHLAB applied/)).toBeInTheDocument();
    expect(screen.getByText(/Discount code SMITHLAB/)).toBeInTheDocument();
    expect(screen.getByText("−$7.90")).toBeInTheDocument();
    expect(window.localStorage.getItem(CART_CODE_KEY)).toBe("SMITHLAB");
    fireEvent.click(screen.getByRole("button", { name: "Remove code" }));
    expect(screen.queryByText(/SMITHLAB applied/)).toBeNull();
    expect(window.localStorage.getItem(CART_CODE_KEY)).toBeNull();
  });

  it("a discount code is saved and applied at checkout", async () => {
    checkCodeAction.mockResolvedValue({ ok: true, kind: "discount", code: "SPRING20", capPct: 30,
      terms: { kind: "order_pct", value: 20, stackOnTop: true, freeShipping: false, minOrderCents: null, includeSlugs: [], excludeSlugs: [], includeClasses: [], excludeClasses: [] } });
    render(<CartProvider catalog={liveFixture()}><CartView /></CartProvider>);
    fireEvent.change(await screen.findByLabelText("Discount code"), { target: { value: "spring20" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(await screen.findByText("✓ SPRING20 · 20% off your order — applied at checkout")).toBeInTheDocument();
    expect(window.localStorage.getItem(CART_CODE_KEY)).toBe("SPRING20");
  });

  it("saves the code for checkout when the shopper isn't signed in yet", async () => {
    checkCodeAction.mockResolvedValue({ ok: false, message: "Please sign in.", needsSignIn: true });
    render(<CartProvider catalog={liveFixture()}><CartView /></CartProvider>);
    fireEvent.change(await screen.findByLabelText("Discount code"), { target: { value: "smithlab" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(await screen.findByText(/SMITHLAB saved/)).toBeInTheDocument();
    expect(window.localStorage.getItem(CART_CODE_KEY)).toBe("SMITHLAB");
    expect(screen.queryByText(/−\$/)).toBeNull();   // no saving shown until it's verified
  });

  it("explains a refused code and doesn't keep it", async () => {
    checkCodeAction.mockResolvedValue({ ok: false, message: "This code can't be used." });
    render(<CartProvider catalog={liveFixture()}><CartView /></CartProvider>);
    fireEvent.change(await screen.findByLabelText("Discount code"), { target: { value: "nope" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(await screen.findByText("This code can't be used.")).toBeInTheDocument();
    expect(window.localStorage.getItem(CART_CODE_KEY)).toBeNull();
  });

  it("re-checks a code saved earlier when the cart opens", async () => {
    window.localStorage.setItem(CART_CODE_KEY, "SMITHLAB");
    checkCodeAction.mockResolvedValue({ ok: true, kind: "partner", code: "SMITHLAB" });
    render(<CartProvider catalog={liveFixture()}><CartView /></CartProvider>);
    await waitFor(() => expect(checkCodeAction).toHaveBeenCalledWith("SMITHLAB"));
    expect(await screen.findByText("−$7.90")).toBeInTheDocument();
  });

  it("on the cart page, links back to the product most recently added", async () => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([
      { slug: "bpc-157", variantId: "10mg", packQty: 2, quantity: 1 },
      { slug: "mots-c", variantId: "10mg", packQty: 2, quantity: 1 },
    ]));
    render(<CartProvider catalog={liveFixture()}><CartBackLink /></CartProvider>);
    expect(await screen.findByRole("link", { name: "← Back to MOTS-c" })).toHaveAttribute("href", "/products/mots-c");
  });

  it("with an empty cart, the back link goes to the catalog", async () => {
    window.localStorage.clear();
    render(<CartProvider catalog={liveFixture()}><CartBackLink /></CartProvider>);
    expect(await screen.findByRole("link", { name: "← Back to shop" })).toHaveAttribute("href", "/products");
  });
});
