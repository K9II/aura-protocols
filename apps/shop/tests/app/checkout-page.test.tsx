import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { requireCustomer, creditBalance, listOpenOrdersForCustomer } = vi.hoisted(() => ({
  requireCustomer: vi.fn(async () => ({ id: "u1", email: "j@lab.org", emailConfirmed: false, ship: null })),
  creditBalance: vi.fn(async () => 0),
  listOpenOrdersForCustomer: vi.fn(async () => [] as unknown[]),
}));
vi.mock("@/lib/dal", () => ({ requireCustomer }));
vi.mock("@/lib/partners/ledger", () => ({ creditBalance }));
vi.mock("@/lib/account/offer-data", () => ({ offerForCustomer: async () => null }));
vi.mock("@/lib/discounts/data", () => ({ getDiscountCap: vi.fn().mockResolvedValue(30) }));
vi.mock("@/lib/orders", async (orig) => ({ ...(await orig<typeof import("@/lib/orders")>()), listOpenOrdersForCustomer }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/components/account/CheckoutForm", () => ({ default: (p: { creditBalanceCents: number; capPct: number; needsResearch: boolean; organization: string | null }) =>
  <><div data-testid="credit">{p.creditBalanceCents}</div><div data-testid="cap">{p.capPct}</div><div data-testid="research">{String(p.needsResearch)}</div><div data-testid="org">{p.organization ?? ""}</div></> }));
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

  it("passes the store-wide discount cap to the form", async () => {
    requireCustomer.mockResolvedValueOnce({ id: "u1", email: "j@lab.org", emailConfirmed: true, ship: null });
    render(await CheckoutPage());
    expect(screen.getByTestId("cap").textContent).toBe("30");
  });

  it("asks for research details until the account has them, prefilled from sign-up", async () => {
    requireCustomer.mockResolvedValueOnce({ id: "u1", email: "j@lab.org", emailConfirmed: true, ship: null, organization: "Halden Labs", research: null } as never);
    render(await CheckoutPage());
    expect(screen.getByTestId("research").textContent).toBe("true");
    expect(screen.getByTestId("org").textContent).toBe("Halden Labs");
  });

  it("doesn't ask again once verified", async () => {
    requireCustomer.mockResolvedValueOnce({ id: "u1", email: "j@lab.org", emailConfirmed: true, ship: null, organization: null, research: { field: "independent", org: "Lab", verifiedAt: "2026-10-07T00:00:00Z" } } as never);
    render(await CheckoutPage());
    expect(screen.getByTestId("research").textContent).toBe("false");
  });
});
