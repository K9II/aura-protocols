import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const m = vi.hoisted(() => ({ requireCustomer: vi.fn(), getOrderForCustomer: vi.fn(), retrieve: vi.fn(), notFound: vi.fn() }));
vi.mock("@/lib/dal", () => ({ requireCustomer: m.requireCustomer }));
vi.mock("@/lib/orders", () => ({ getOrderForCustomer: m.getOrderForCustomer }));
vi.mock("@/lib/stripe", () => ({ getStripe: () => ({ checkout: { sessions: { retrieve: m.retrieve } } }) }));
vi.mock("next/navigation", () => ({ notFound: m.notFound }));
vi.mock("@/components/account/ClearCart", () => ({ default: () => <div data-testid="clear-cart" /> }));
vi.mock("@/components/account/OrderCard", () => ({ default: () => <div>card</div> }));

const order = (over: Record<string, unknown> = {}) => ({
  id: "o1", order_number: "AP-1061", status: "paid", kind: "sale", stripe_session_id: null, total_cents: 9600, order_items: [], ...over,
});

async function page(o: ReturnType<typeof order>) {
  m.getOrderForCustomer.mockResolvedValue(o);
  const { default: OrderPage } = await import("@/app/order/[number]/page");
  return render(await OrderPage({ params: Promise.resolve({ number: "AP-1061" }), searchParams: Promise.resolve({}) }));
}

describe("customer order page", () => {
  beforeEach(() => {
    vi.resetModules();
    m.requireCustomer.mockResolvedValue({ id: "c1" });
  });

  it("a paid sale thanks the customer and mentions the confirmation email", async () => {
    const { container } = await page(order());
    expect(container.textContent).toMatch(/Thank you\./);
    expect(container.textContent).toMatch(/confirmation email is on its way/);
    expect(screen.getByTestId("clear-cart")).toBeInTheDocument();
  });

  it.each(["paid", "shipped"])("a %s no-charge order says it's sent at no charge — no receipt, no refund wording, cart left alone", async (status) => {
    const { container } = await page(order({ kind: "no_charge", status, total_cents: 0 }));
    const text = container.textContent ?? "";
    expect(text).toMatch(/Sent at no charge\./);
    expect(text).toMatch(/Nothing was charged/);
    expect(text).not.toMatch(/confirmation email|refund|Thank you/i);
    expect(screen.queryByTestId("clear-cart")).toBeNull();
  });

  it("a cancelled no-charge order says nothing was charged, never refunded", async () => {
    const { container } = await page(order({ kind: "no_charge", status: "refunded", total_cents: 0 }));
    const text = container.textContent ?? "";
    expect(text).toMatch(/Order cancelled\./);
    expect(text).toMatch(/Cancelled — nothing was charged\./);
    expect(text).not.toMatch(/refund/i);
  });
});
