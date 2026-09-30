import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Compound } from "@/data/catalog";

const getCustomer = vi.fn();
const createPendingOrder = vi.fn();
const attachCheckoutSession = vi.fn();
const transitionOrder = vi.fn();
const saveShipAddress = vi.fn();
const saveStripeCustomerId = vi.fn();
const createCheckout = vi.fn();
vi.mock("@/lib/dal", () => ({ getCustomer }));
vi.mock("@/lib/orders", () => ({ createPendingOrder, attachCheckoutSession, transitionOrder, saveShipAddress, saveStripeCustomerId }));
vi.mock("@/lib/commerce", () => ({ getCommerceAdapter: () => ({ createCheckout }) }));

const tested = { lot: "AP-0001", purityPct: 99.5, method: "HPLC" as const, testedOn: "2026-09-01", coaFile: "/coa/AP-0001.pdf" };
vi.mock("@/data/catalog", () => ({
  compounds: [{
    slug: "bpc-157", name: "BPC-157", chemicalClass: "Peptide Fragments", identity: {}, form: "", storage: "", vialMl: 3,
    variants: [{ id: "5mg", strength: "5 mg", priceUsd: 49, stock: "in" }],
    packDiscounts: [{ qty: 1, pct: 0 }], currentLot: tested,
  }] satisfies Compound[],
}));

const customer = { id: "u1", email: "j@lab.org", emailConfirmed: true, fullName: "Jane", organization: null, isOwner: false, stripeCustomerId: null, ship: null };
const input = {
  lines: [{ slug: "bpc-157", variantId: "5mg", packQty: 1, quantity: 1 }],
  ship: { name: "Jane", line1: "1 A St", line2: "", city: "Austin", state: "TX", zip: "78701" },
  ruoConfirmed: true,
};

describe("startCheckoutAction", () => {
  beforeEach(() => { vi.resetModules(); for (const f of [getCustomer, createPendingOrder, attachCheckoutSession, transitionOrder, saveShipAddress, saveStripeCustomerId, createCheckout]) f.mockReset(); });

  it("requires a signed-in, verified customer", async () => {
    getCustomer.mockResolvedValue(null);
    const { startCheckoutAction } = await import("@/app/checkout/actions");
    expect((await startCheckoutAction(input)).error).toMatch(/sign in/i);
    getCustomer.mockResolvedValue({ ...customer, emailConfirmed: false });
    expect((await startCheckoutAction(input)).error).toMatch(/verify/i);
  });

  it("requires the per-order research-use confirmation", async () => {
    getCustomer.mockResolvedValue(customer);
    const { startCheckoutAction } = await import("@/app/checkout/actions");
    expect((await startCheckoutAction({ ...input, ruoConfirmed: false })).error).toBeTruthy();
    expect(createPendingOrder).not.toHaveBeenCalled();
  });

  it("refuses items that can't be sold and creates nothing", async () => {
    getCustomer.mockResolvedValue(customer);
    const { startCheckoutAction } = await import("@/app/checkout/actions");
    const r = await startCheckoutAction({ ...input, lines: [{ slug: "nope", variantId: "5mg", packQty: 1, quantity: 1 }] });
    expect(r.rejected).toEqual([{ slug: "nope", variantId: "5mg", reason: "unknown" }]);
    expect(createPendingOrder).not.toHaveBeenCalled();
  });

  it("creates the order from server prices, starts Stripe and returns its URL", async () => {
    getCustomer.mockResolvedValue(customer);
    createPendingOrder.mockResolvedValue({ id: "o1", orderNumber: "AP-1001" });
    createCheckout.mockResolvedValue({ kind: "redirect", url: "https://checkout.stripe.com/x", sessionId: "cs_1", stripeCustomerId: "cus_1" });
    const { startCheckoutAction } = await import("@/app/checkout/actions");
    expect(await startCheckoutAction(input)).toEqual({ url: "https://checkout.stripe.com/x" });
    expect(createPendingOrder.mock.calls[0][0].priced).toMatchObject({ subtotalCents: 4900, shippingCents: 1500, insuranceCents: 550 });
    expect(createCheckout.mock.calls[0][0]).toMatchObject({ shippingCents: 1500, insuranceCents: 550 });
    expect(saveShipAddress).toHaveBeenCalledWith("u1", expect.objectContaining({ state: "TX", line2: null }));
    expect(attachCheckoutSession).toHaveBeenCalledWith("o1", "cs_1");
    expect(saveStripeCustomerId).toHaveBeenCalledWith("u1", "cus_1");
  });

  it("cancels the pending order if Stripe fails, and charges nothing", async () => {
    getCustomer.mockResolvedValue(customer);
    createPendingOrder.mockResolvedValue({ id: "o1", orderNumber: "AP-1001" });
    createCheckout.mockRejectedValue(new Error("stripe down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { startCheckoutAction } = await import("@/app/checkout/actions");
    expect((await startCheckoutAction(input)).error).toMatch(/try again/i);
    expect(transitionOrder).toHaveBeenCalledWith("o1", "awaiting_payment", "cancelled");
  });
});
