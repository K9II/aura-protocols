import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const { checkPartnerCodeAction } = vi.hoisted(() => ({ checkPartnerCodeAction: vi.fn() }));
vi.mock("@/app/checkout/actions", () => ({ checkPartnerCodeAction }));
// Real catalog lots are pending until sourcing (pending items can't be priced or
// bought), so this cart uses a BPC-157 with a tested lot.
vi.mock("@/data/catalog", async (orig) => {
  const real = await orig<typeof import("@/data/catalog")>();
  const lot = { lot: "AP-TEST-1", purityPct: 99.4, method: "HPLC" as const, testedOn: "2026-09-01", coaFile: "/coa/AP-TEST-1.pdf" };
  const compounds = real.compounds.map((c) => (c.slug === "bpc-157" ? { ...c, currentLot: lot } : c));
  return { ...real, compounds };
});
import { CartProvider, CART_STORAGE_KEY, CART_CODE_KEY } from "@/components/store/CartProvider";
import CartView from "@/components/store/CartView";

// BPC-157 10 mg is $79/vial: a 2-pack is $158 list, $150.10 at the pack's 5%;
// a partner code (10% off list) makes it $142.20, so the code saves $7.90.
const oneTwoPack = () => window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([{ slug: "bpc-157", variantId: "10mg", packQty: 2, quantity: 1 }]));

describe("CartView", () => {
  beforeEach(() => { window.localStorage.clear(); checkPartnerCodeAction.mockReset(); oneTwoPack(); });

  it("sends the shopper to /checkout", async () => {
    render(<CartProvider><CartView /></CartProvider>);
    expect(await screen.findByRole("link", { name: /checkout/i })).toHaveAttribute("href", "/checkout");
  });

  it("applies a discount code in the cart and shows the saving", async () => {
    checkPartnerCodeAction.mockResolvedValue({ ok: true, code: "SMITHLAB" });
    render(<CartProvider><CartView /></CartProvider>);
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

  it("saves the code for checkout when the shopper isn't signed in yet", async () => {
    checkPartnerCodeAction.mockResolvedValue({ ok: false, message: "Please sign in.", needsSignIn: true });
    render(<CartProvider><CartView /></CartProvider>);
    fireEvent.change(await screen.findByLabelText("Discount code"), { target: { value: "smithlab" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(await screen.findByText(/SMITHLAB saved/)).toBeInTheDocument();
    expect(window.localStorage.getItem(CART_CODE_KEY)).toBe("SMITHLAB");
    expect(screen.queryByText(/−\$/)).toBeNull();   // no saving shown until it's verified
  });

  it("explains a refused code and doesn't keep it", async () => {
    checkPartnerCodeAction.mockResolvedValue({ ok: false, message: "This code can't be used." });
    render(<CartProvider><CartView /></CartProvider>);
    fireEvent.change(await screen.findByLabelText("Discount code"), { target: { value: "nope" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(await screen.findByText("This code can't be used.")).toBeInTheDocument();
    expect(window.localStorage.getItem(CART_CODE_KEY)).toBeNull();
  });

  it("re-checks a code saved earlier when the cart opens", async () => {
    window.localStorage.setItem(CART_CODE_KEY, "SMITHLAB");
    checkPartnerCodeAction.mockResolvedValue({ ok: true, code: "SMITHLAB" });
    render(<CartProvider><CartView /></CartProvider>);
    await waitFor(() => expect(checkPartnerCodeAction).toHaveBeenCalledWith("SMITHLAB"));
    expect(await screen.findByText("−$7.90")).toBeInTheDocument();
  });
});
