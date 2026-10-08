import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const m = vi.hoisted(() => ({ requireCustomer: vi.fn(), getOrderForCustomer: vi.fn(), getWholesaleSettings: vi.fn(), notFound: vi.fn() }));
vi.mock("@/lib/dal", () => ({ requireCustomer: m.requireCustomer }));
vi.mock("@/lib/orders", () => ({ getOrderForCustomer: m.getOrderForCustomer }));
vi.mock("@/lib/stripe", () => ({ getStripe: () => ({ checkout: { sessions: { retrieve: vi.fn() } } }) }));
vi.mock("@/lib/wholesale/data", () => ({ getWholesaleSettings: m.getWholesaleSettings }));
vi.mock("@/lib/clock", () => ({ currentMs: () => Date.parse("2026-10-09T18:00:00Z") }));
vi.mock("next/navigation", () => ({ notFound: m.notFound, useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/components/account/ClearCart", () => ({ default: () => null }));
vi.mock("@/components/account/OrderCard", () => ({ default: () => <div>order card</div> }));
vi.mock("@/app/wholesale/actions", () => ({ cancelWholesaleOrderAction: vi.fn() }));

const ws = (o: Record<string, unknown> = {}) => ({ id: "o1", order_number: "AP-1050", channel: "wholesale", status: "deposit_paid", kind: "sale",
  wholesale_cutoff_on: "2026-10-19", deposit_cents: 161600, balance_cents: 262746, shipping_cents: 0, insurance_cents: 550, order_items: [], ...o });

async function page(o: ReturnType<typeof ws>) {
  m.getOrderForCustomer.mockResolvedValue(o);
  const { default: Page } = await import("@/app/order/[number]/page");
  return render(await Page({ params: Promise.resolve({ number: "AP-1050" }), searchParams: Promise.resolve({}) }));
}

describe("order page · wholesale", () => {
  beforeEach(() => { vi.resetModules(); m.requireCustomer.mockResolvedValue({ id: "c1" }); m.getWholesaleSettings.mockResolvedValue({ leadDays: 28 }); });

  it("deposit paid: deposit, balance, run dates and Cancel before the order-by date", async () => {
    const { container } = await page(ws());
    expect(container.textContent).toMatch(/Deposit received\./);
    expect(screen.getByText("$1,616.00")).toBeTruthy();
    expect(screen.getByText("$2,627.46")).toBeTruthy();
    expect(screen.getByText("Nov 16")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel order" })).toBeTruthy();
    expect(container.textContent).not.toMatch(/lot tests?(?!ed)/i);   // "Lot tested ≈" is the run date, not a charge
  });

  it("no Cancel after the order-by date", async () => {
    await page(ws({ wholesale_cutoff_on: "2026-10-05" }));
    expect(screen.queryByRole("button", { name: "Cancel order" })).toBeNull();
  });

  it("cancelled (deposit refunded): says the deposit is being refunded", async () => {
    const { container } = await page(ws({ status: "refunded" }));
    expect(container.textContent).toMatch(/Order cancelled\./);
    expect(container.textContent).toMatch(/deposit of \$1,616\.00 is being refunded/);
    expect(screen.queryByRole("button", { name: "Cancel order" })).toBeNull();
  });

  it("settings unreadable: still shows the deposit and balance, without dates", async () => {
    m.getWholesaleSettings.mockRejectedValue(new Error("down"));
    await page(ws());
    expect(screen.getByText("$1,616.00")).toBeTruthy();
    expect(screen.queryByText("Nov 16")).toBeNull();
  });
});
