import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Compound } from "@/data/catalog";

const { checkPartnerCodeAction, startCheckoutAction, lines, cart } = vi.hoisted(() => ({
  checkPartnerCodeAction: vi.fn(),
  startCheckoutAction: vi.fn(),
  lines: [{ slug: "bpc-157", variantId: "5mg", packQty: 1, quantity: 1 }],
  cart: { code: "", setCode: vi.fn() },
}));
vi.mock("@/app/checkout/actions", () => ({ checkPartnerCodeAction, startCheckoutAction }));
vi.mock("@/components/store/CartProvider", () => ({ useCart: () => ({ lines, code: cart.code, setCode: cart.setCode }) }));

const tested = { lot: "AP-0001", purityPct: 99.5, method: "HPLC" as const, testedOn: "2026-09-01", coaFile: "/coa/AP-0001.pdf" };
vi.mock("@/data/catalog", () => ({
  compounds: [{
    slug: "bpc-157", name: "BPC-157", chemicalClass: "Peptide Fragments", identity: {}, form: "", storage: "", vialMl: 3,
    variants: [{ id: "5mg", strength: "5 mg", priceUsd: 49, stock: "in" }],
    packDiscounts: [{ qty: 1, pct: 0 }, { qty: 2, pct: 5 }], currentLot: tested,
  }] satisfies Compound[],
}));

const { default: CheckoutForm } = await import("@/components/account/CheckoutForm");

describe("CheckoutForm", () => {
  beforeEach(() => {
    checkPartnerCodeAction.mockReset();
    startCheckoutAction.mockReset();
    startCheckoutAction.mockResolvedValue({ error: "stopped for the test" });
    cart.code = ""; cart.setCode.mockReset();
  });

  it("applies a code the shopper entered in the cart, ahead of a referral-link code", async () => {
    cart.code = "SMITHLAB";
    checkPartnerCodeAction.mockResolvedValue({ ok: true, code: "SMITHLAB" });
    render(<CheckoutForm email="j@lab.org" ship={null} initialCode="otherref" creditBalanceCents={0} newAccountOffer={null} />);
    await waitFor(() => expect(checkPartnerCodeAction).toHaveBeenCalledWith("SMITHLAB"));
    expect(checkPartnerCodeAction).not.toHaveBeenCalledWith("otherref");
    await waitFor(() => expect(screen.getByText(/SMITHLAB applied/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /remove/i }));
    expect(cart.setCode).toHaveBeenCalledWith("");   // removing it at checkout removes it from the cart too
  });

  it("auto-applies a valid referral-link code on mount, without the customer typing anything", async () => {
    checkPartnerCodeAction.mockResolvedValue({ ok: true, code: "SMITHLAB" });
    render(<CheckoutForm email="j@lab.org" ship={null} initialCode="smithlab" creditBalanceCents={0} newAccountOffer={null} />);
    await waitFor(() => expect(checkPartnerCodeAction).toHaveBeenCalledWith("smithlab"));
    await waitFor(() => expect(screen.getByText(/SMITHLAB applied/)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /remove/i })).toBeInTheDocument();
  });

  it("links from the order summary back to the cart to edit it", () => {
    render(<CheckoutForm email="j@lab.org" ship={null} initialCode="" creditBalanceCents={0} newAccountOffer={null} />);
    expect(screen.getByRole("link", { name: /edit cart/i })).toHaveAttribute("href", "/cart");
  });

  it("does not call the server when there is no referral code to apply", () => {
    render(<CheckoutForm email="j@lab.org" ship={null} initialCode="" creditBalanceCents={0} newAccountOffer={null} />);
    expect(checkPartnerCodeAction).not.toHaveBeenCalled();
  });

  it("sends a typed-but-never-applied code on submit instead of silently dropping it", async () => {
    const { container } = render(<CheckoutForm email="j@lab.org" ship={null} initialCode="" creditBalanceCents={0} newAccountOffer={null} />);
    const input = screen.getByLabelText(/discount code/i);
    fireEvent.change(input, { target: { value: "loose" } });
    const form = container.querySelector("form")!;
    fireEvent.submit(form);
    await waitFor(() => expect(startCheckoutAction).toHaveBeenCalled());
    expect(startCheckoutAction.mock.calls[0][0]).toMatchObject({ partnerCode: "loose" });
  });

  it("sends the applied code, not stray input, once a code has been explicitly applied", async () => {
    checkPartnerCodeAction.mockResolvedValue({ ok: true, code: "SMITHLAB" });
    const { container } = render(<CheckoutForm email="j@lab.org" ship={null} initialCode="" creditBalanceCents={0} newAccountOffer={null} />);
    const input = screen.getByLabelText(/discount code/i);
    fireEvent.change(input, { target: { value: "smithlab" } });
    fireEvent.click(screen.getByRole("button", { name: /apply/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /remove/i })).toBeInTheDocument());
    const form = container.querySelector("form")!;
    fireEvent.submit(form);
    await waitFor(() => expect(startCheckoutAction).toHaveBeenCalled());
    expect(startCheckoutAction.mock.calls[0][0]).toMatchObject({ partnerCode: "SMITHLAB" });
  });

  it("re-enables the pay button and shows the error when starting checkout throws", async () => {
    startCheckoutAction.mockRejectedValue(new Error("network"));
    const { container } = render(<CheckoutForm email="j@lab.org" ship={null} initialCode="" creditBalanceCents={0} newAccountOffer={null} />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong — please try again."));
    expect(screen.getByRole("button", { name: /continue to secure payment/i })).toBeInTheDocument();
  });

  it("shows an error instead of hanging when checking a code throws", async () => {
    checkPartnerCodeAction.mockRejectedValue(new Error("network"));
    render(<CheckoutForm email="j@lab.org" ship={null} initialCode="" creditBalanceCents={0} newAccountOffer={null} />);
    fireEvent.change(screen.getByLabelText(/discount code/i), { target: { value: "AURA-7K2Q" } });
    fireEvent.click(screen.getByRole("button", { name: /apply/i }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Something went wrong — please try again."));
  });

  it("shows only the code discount on a 2-pack line when a code beats the pack discount — no stacked pack %, list price struck through", async () => {
    checkPartnerCodeAction.mockResolvedValue({ ok: true, code: "SMITHLAB" });
    const original = [...lines];
    lines.length = 0;
    lines.push({ slug: "bpc-157", variantId: "5mg", packQty: 2, quantity: 1 });
    try {
      render(<CheckoutForm email="j@lab.org" ship={null} initialCode="smithlab" creditBalanceCents={0} newAccountOffer={null} />);
      await waitFor(() => expect(screen.getByText(/code −10%/)).toBeInTheDocument());
      const row = screen.getByText("BPC-157").closest(".s-cart-line")!;
      expect(row.textContent).toContain("2-pack");
      expect(row.textContent).not.toMatch(/−5%/);
      expect(row.textContent).toContain("$98.00");
      expect(row.textContent).toContain("$88.20");
    } finally {
      lines.length = 0;
      lines.push(...original);
    }
  });

  it("shows the automatic new-account 15% when the offer is live", async () => {
    render(<CheckoutForm email="j@lab.org" ship={null} initialCode="" creditBalanceCents={0} newAccountOffer={{ endsAt: "2026-10-18T23:59:59.999Z" }} />);
    expect(screen.getByText("New account: 15% off this first order, applied automatically.")).toBeInTheDocument();
    expect(screen.getByText(/Includes new-account 15%/)).toBeInTheDocument();
  });
});
