import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CartProvider, CART_STORAGE_KEY } from "@/components/store/CartProvider";
import CartView from "@/components/store/CartView";

describe("CartView checkout", () => {
  it("sends the shopper to /checkout", async () => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([{ slug: "bpc-157", variantId: "5mg", packQty: 2, quantity: 1 }]));
    render(<CartProvider><CartView /></CartProvider>);
    expect(await screen.findByRole("link", { name: /checkout/i })).toHaveAttribute("href", "/checkout");
  });
});
