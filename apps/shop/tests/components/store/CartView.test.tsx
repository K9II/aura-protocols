import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CartProvider, CART_STORAGE_KEY } from "@/components/store/CartProvider";
import CartView from "@/components/store/CartView";
import * as commerce from "@/lib/commerce";

describe("CartView checkout", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([{ slug: "bpc-157", variantId: "5mg", packQty: 1, quantity: 1 }]),
    );
  });
  afterEach(() => vi.restoreAllMocks());

  it("shows a notice instead of an unhandled rejection when checkout throws", async () => {
    vi.spyOn(commerce, "getCommerceAdapter").mockReturnValue({
      createCheckout: () => Promise.reject(new Error("network down")),
    });
    render(
      <CartProvider>
        <CartView />
      </CartProvider>,
    );
    fireEvent.click(await screen.findByRole("button", { name: /checkout/i }));
    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
  });
});
