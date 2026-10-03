import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { requireCustomer, creditBalance, listOpenOrdersForCustomer } = vi.hoisted(() => ({
  requireCustomer: vi.fn(async () => ({ id: "u1", email: "j@lab.org", emailConfirmed: false, ship: null })),
  creditBalance: vi.fn(async () => 0),
  listOpenOrdersForCustomer: vi.fn(async () => [] as unknown[]),
}));
vi.mock("@/lib/dal", () => ({ requireCustomer }));
vi.mock("@/lib/partners/ledger", () => ({ creditBalance }));
vi.mock("@/lib/orders", async (orig) => ({ ...(await orig<typeof import("@/lib/orders")>()), listOpenOrdersForCustomer }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/components/account/CheckoutForm", () => ({ default: (p: { creditBalanceCents: number }) => <div data-testid="credit">{p.creditBalanceCents}</div> }));
import CheckoutPage from "@/app/checkout/page";

describe("checkout page", () => {
  it("has a way back to the cart to change the order", async () => {
    render(await CheckoutPage());
    expect(screen.getByRole("link", { name: /back to cart/i })).toHaveAttribute("href", "/cart");
  });

  // A shopper who backed out of Stripe's page still has that checkout holding their
  // credit; starting a new one hands it back first, so it's shown as available.
  it("counts store credit held by the shopper's own abandoned checkout as available", async () => {
    requireCustomer.mockResolvedValueOnce({ id: "u1", email: "j@lab.org", emailConfirmed: true, ship: null });
    creditBalance.mockResolvedValueOnce(0);
    listOpenOrdersForCustomer.mockResolvedValueOnce([{ id: "o1", order_number: "AP-1", stripe_session_id: "cs_1", created_at: new Date().toISOString(), store_credit_cents: 3050 }]);
    render(await CheckoutPage());
    expect(screen.getByTestId("credit").textContent).toBe("3050");
  });
});
