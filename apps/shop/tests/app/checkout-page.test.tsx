import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/dal", () => ({ requireCustomer: vi.fn(async () => ({ id: "u1", email: "j@lab.org", emailConfirmed: false, ship: null })) }));
vi.mock("@/lib/partners/ledger", () => ({ creditBalance: vi.fn(async () => 0) }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/components/account/CheckoutForm", () => ({ default: () => <div /> }));
import CheckoutPage from "@/app/checkout/page";

describe("checkout page", () => {
  it("has a way back to the cart to change the order", async () => {
    render(await CheckoutPage());
    expect(screen.getByRole("link", { name: /back to cart/i })).toHaveAttribute("href", "/cart");
  });
});
