import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import type { Compound } from "@/data/catalog";
import { OFFER_PCT_TEXT } from "@/lib/account/offer";

const tested = { lot: "AP-0001", purityPct: 99.5, method: "HPLC" as const, testedOn: "2026-09-01", coaFile: "/coa/AP-0001.pdf" };
// The live catalog comes from the cart context (CartProvider's `catalog`).
const catalog: Compound[] = [{
  slug: "bpc-157", name: "BPC-157", chemicalClass: "Peptide Fragments", identity: {}, form: "", storage: "", vialMl: 3,
  variants: [{ id: "5mg", strength: "5 mg", shown: true, priceUsd: 49, stock: "in", lot: tested }],
  packDiscounts: [{ qty: 1, pct: 0 }, { qty: 2, pct: 5 }],
}];
const { checkCodeAction, startCheckoutAction, lines, cart } = vi.hoisted(() => ({
  checkCodeAction: vi.fn(),
  startCheckoutAction: vi.fn(),
  lines: [{ slug: "bpc-157", variantId: "5mg", packQty: 1, quantity: 1 }],
  cart: { code: "", setCode: vi.fn(), removeStrengths: vi.fn(), refresh: vi.fn() },
}));
vi.mock("@/app/checkout/actions", () => ({ checkCodeAction, startCheckoutAction }));
vi.mock("@/components/store/CartProvider", () => ({ useCart: () => ({ catalog, lines, code: cart.code, setCode: cart.setCode, removeStrengths: cart.removeStrengths }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: cart.refresh }) }));
// A stand-in for the Turnstile widget: passes at once (with a token per reset)
// unless a test turns autoPass off and passes it by hand.
const { human } = vi.hoisted(() => ({ human: { autoPass: true, resets: 0, pass: null as null | ((t: string) => void) } }));
vi.mock("@/components/account/HumanCheck", async () => {
  const { useEffect } = await import("react");
  function FakeHumanCheck({ onToken, resetKey }: { onToken: (t: string | null) => void; resetKey: number }) {
    useEffect(() => { human.pass = (t) => onToken(t); }, [onToken]);
    useEffect(() => {
      if (resetKey > 0) { human.resets++; onToken(null); }
      if (human.autoPass) onToken(`tok-${resetKey}`);
    }, [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps
    return <div data-testid="human-widget" />;
  }
  return { default: FakeHumanCheck };
});

const { default: CheckoutForm } = await import("@/components/account/CheckoutForm");
type FormProps = Parameters<typeof CheckoutForm>[0];
const renderForm = (p: Partial<FormProps> = {}) =>
  render(<CheckoutForm email="j@lab.org" ship={null} initialCode="" creditBalanceCents={0} newAccountOffer={null} capPct={30} needsResearch={false} organization={null} {...p} />);

describe("CheckoutForm", () => {
  beforeEach(() => {
    checkCodeAction.mockReset();
    startCheckoutAction.mockReset();
    startCheckoutAction.mockResolvedValue({ error: "stopped for the test" });
    cart.code = ""; cart.setCode.mockReset(); cart.removeStrengths.mockReset(); cart.refresh.mockReset();
    human.autoPass = true; human.resets = 0; human.pass = null;
  });

  it("shows the A2 check at the top and keeps the form locked until it passes", async () => {
    human.autoPass = false;
    renderForm();
    expect(screen.getByRole("heading", { name: /Confirming you are NOT an Alien — or even worse, a bot\./ })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /order details/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /continue to secure payment/i })).toBeDisabled();
    act(() => human.pass!("tok"));
    expect(screen.getByRole("group", { name: /order details/i })).not.toBeDisabled();
    expect(screen.getByText(/✓ Verified/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /NOT an Alien/ })).toBeNull();
  });

  it("sends the token, and resets the widget after an attempt that doesn't leave", async () => {
    const { container } = renderForm();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => expect(startCheckoutAction).toHaveBeenCalled());
    expect(startCheckoutAction.mock.calls[0][0]).toMatchObject({ humanToken: "tok-0" });
    await waitFor(() => expect(human.resets).toBe(1));
  });

  it("first order: research box defaults to Independent Researcher, prefills the company and sends both", async () => {
    const { container } = renderForm({ needsResearch: true, organization: "Halden Labs" });
    expect(screen.getByLabelText(/field of qualified research/i)).toHaveValue("independent");
    expect(screen.getByLabelText(/company or institution/i)).toHaveValue("Halden Labs");
    expect(screen.getByText(/one time only/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => expect(startCheckoutAction).toHaveBeenCalled());
    expect(startCheckoutAction.mock.calls[0][0]).toMatchObject({ research: { field: "independent", org: "Halden Labs" } });
  });

  it("no research box once the account is verified, and nothing sent for it", async () => {
    const { container } = renderForm();
    expect(screen.queryByLabelText(/field of qualified research/i)).toBeNull();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => expect(startCheckoutAction).toHaveBeenCalled());
    expect(startCheckoutAction.mock.calls[0][0].research).toBeUndefined();
  });

  it("removes sold-out lines from the cart, shows the message and refreshes the page's stock", async () => {
    const msg = "MOTS-c 10 mg just sold out — we've removed it from your cart.";
    startCheckoutAction.mockResolvedValue({ error: msg, rejected: [{ slug: "mots-c", variantId: "10mg", reason: "sold_out" }] });
    catalog.push({ ...catalog[0], slug: "mots-c", name: "MOTS-c", variants: [{ ...catalog[0].variants[0], id: "10mg", strength: "10 mg" }] });
    const original = [...lines];
    lines.length = 0;
    lines.push({ slug: "mots-c", variantId: "10mg", packQty: 1, quantity: 1 }, { slug: "bpc-157", variantId: "5mg", packQty: 1, quantity: 1 });
    try {
      const { container } = renderForm();
      fireEvent.click(screen.getByRole("checkbox"));
      fireEvent.submit(container.querySelector("form")!);
      await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(msg));
      expect(cart.removeStrengths).toHaveBeenCalledTimes(1);
      expect(cart.removeStrengths).toHaveBeenCalledWith([{ slug: "mots-c", variantId: "10mg", reason: "sold_out" }]);
      expect(cart.refresh).toHaveBeenCalled();
      // The removed line isn't left listed as blocking checkout.
      expect(screen.queryByText(/remove it from your cart to continue/)).not.toBeInTheDocument();
    } finally {
      lines.length = 0;
      lines.push(...original);
      catalog.pop();
    }
  });

  it("still shows the sold-out message when the sold-out line was the whole cart", async () => {
    const msg = "BPC-157 5 mg just sold out — we've removed it from your cart.";
    startCheckoutAction.mockResolvedValue({ error: msg, rejected: [{ slug: "bpc-157", variantId: "5mg", reason: "sold_out" }] });
    const original = [...lines];
    cart.removeStrengths.mockImplementation(() => { lines.length = 0; });
    try {
      const { container } = renderForm();
      fireEvent.click(screen.getByRole("checkbox"));
      fireEvent.submit(container.querySelector("form")!);
      await waitFor(() => expect(screen.getByText("Your cart is empty.")).toBeInTheDocument());
      expect(screen.getByRole("alert")).toHaveTextContent(msg);
    } finally {
      lines.length = 0;
      lines.push(...original);
    }
  });

  it("other rejections stay listed and don't refresh or remove anything", async () => {
    startCheckoutAction.mockResolvedValue({ error: "Some items can't be ordered right now — they've been flagged below.", rejected: [{ slug: "bpc-157", variantId: "5mg", reason: "pending_lot" }] });
    const { container } = renderForm();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => expect(screen.getByText(/certificate pending; remove it from your cart to continue/)).toBeInTheDocument());
    expect(cart.removeStrengths).not.toHaveBeenCalled();
    expect(cart.refresh).not.toHaveBeenCalled();
  });

  it("applies a code the shopper entered in the cart, ahead of a referral-link code", async () => {
    cart.code = "SMITHLAB";
    checkCodeAction.mockResolvedValue({ ok: true, kind: "partner", code: "SMITHLAB" });
    render(<CheckoutForm email="j@lab.org" ship={null} initialCode="otherref" creditBalanceCents={0} newAccountOffer={null} capPct={30} needsResearch={false} organization={null} />);
    await waitFor(() => expect(checkCodeAction).toHaveBeenCalledWith("SMITHLAB"));
    expect(checkCodeAction).not.toHaveBeenCalledWith("otherref");
    await waitFor(() => expect(screen.getByText(/SMITHLAB applied/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /remove/i }));
    expect(cart.setCode).toHaveBeenCalledWith("");   // removing it at checkout removes it from the cart too
  });

  it("auto-applies a valid referral-link code on mount, without the customer typing anything", async () => {
    checkCodeAction.mockResolvedValue({ ok: true, kind: "partner", code: "SMITHLAB" });
    render(<CheckoutForm email="j@lab.org" ship={null} initialCode="smithlab" creditBalanceCents={0} newAccountOffer={null} capPct={30} needsResearch={false} organization={null} />);
    await waitFor(() => expect(checkCodeAction).toHaveBeenCalledWith("smithlab"));
    await waitFor(() => expect(screen.getByText(/SMITHLAB applied/)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /remove/i })).toBeInTheDocument();
  });

  it("links from the order summary back to the cart to edit it", () => {
    render(<CheckoutForm email="j@lab.org" ship={null} initialCode="" creditBalanceCents={0} newAccountOffer={null} capPct={30} needsResearch={false} organization={null} />);
    expect(screen.getByRole("link", { name: /edit cart/i })).toHaveAttribute("href", "/cart");
  });

  it("does not call the server when there is no referral code to apply", () => {
    render(<CheckoutForm email="j@lab.org" ship={null} initialCode="" creditBalanceCents={0} newAccountOffer={null} capPct={30} needsResearch={false} organization={null} />);
    expect(checkCodeAction).not.toHaveBeenCalled();
  });

  it("sends a typed-but-never-applied code on submit instead of silently dropping it", async () => {
    const { container } = render(<CheckoutForm email="j@lab.org" ship={null} initialCode="" creditBalanceCents={0} newAccountOffer={null} capPct={30} needsResearch={false} organization={null} />);
    const input = screen.getByLabelText(/discount code/i);
    fireEvent.change(input, { target: { value: "loose" } });
    const form = container.querySelector("form")!;
    fireEvent.submit(form);
    await waitFor(() => expect(startCheckoutAction).toHaveBeenCalled());
    expect(startCheckoutAction.mock.calls[0][0]).toMatchObject({ partnerCode: "loose" });
  });

  it("sends the applied code, not stray input, once a code has been explicitly applied", async () => {
    checkCodeAction.mockResolvedValue({ ok: true, kind: "partner", code: "SMITHLAB" });
    const { container } = render(<CheckoutForm email="j@lab.org" ship={null} initialCode="" creditBalanceCents={0} newAccountOffer={null} capPct={30} needsResearch={false} organization={null} />);
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
    const { container } = render(<CheckoutForm email="j@lab.org" ship={null} initialCode="" creditBalanceCents={0} newAccountOffer={null} capPct={30} needsResearch={false} organization={null} />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong — please try again."));
    expect(screen.getByRole("button", { name: /continue to secure payment/i })).toBeInTheDocument();
  });

  it("shows an error instead of hanging when checking a code throws", async () => {
    checkCodeAction.mockRejectedValue(new Error("network"));
    render(<CheckoutForm email="j@lab.org" ship={null} initialCode="" creditBalanceCents={0} newAccountOffer={null} capPct={30} needsResearch={false} organization={null} />);
    fireEvent.change(screen.getByLabelText(/discount code/i), { target: { value: "AURA-7K2Q" } });
    fireEvent.click(screen.getByRole("button", { name: /apply/i }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Something went wrong — please try again."));
  });

  it("shows only the code discount on a 2-pack line when a code beats the pack discount — no stacked pack %, list price struck through", async () => {
    checkCodeAction.mockResolvedValue({ ok: true, kind: "partner", code: "SMITHLAB" });
    const original = [...lines];
    lines.length = 0;
    lines.push({ slug: "bpc-157", variantId: "5mg", packQty: 2, quantity: 1 });
    try {
      render(<CheckoutForm email="j@lab.org" ship={null} initialCode="smithlab" creditBalanceCents={0} newAccountOffer={null} capPct={30} needsResearch={false} organization={null} />);
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

  it("shows the automatic new-account percent when the offer is live", async () => {
    render(<CheckoutForm email="j@lab.org" ship={null} initialCode="" creditBalanceCents={0} newAccountOffer={{ endsAt: "2026-10-18T23:59:59.999Z" }} capPct={30} needsResearch={false} organization={null} />);
    expect(screen.getByText(`New account: ${OFFER_PCT_TEXT} off this first order, applied automatically.`)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`Includes new-account ${OFFER_PCT_TEXT}`))).toBeInTheDocument();
  });
  it("previews a discount code with free shipping and the message", async () => {
    checkCodeAction.mockResolvedValue({ ok: true, kind: "discount", code: "SPRING20", capPct: 30,
      terms: { kind: "order_pct", value: 20, stackOnTop: true, freeShipping: true, minOrderCents: null, includeSlugs: [], excludeSlugs: [], includeClasses: [], excludeClasses: [] } });
    renderForm({ initialCode: "SPRING20" });
    expect(await screen.findByRole("status")).toHaveTextContent("SPRING20 applied — 20% off your order and free shipping.");
    expect(screen.getByText(/^Shipping$/).parentElement).toHaveTextContent(/Free/);
    expect(screen.getByText(/Includes discount code SPRING20/)).not.toHaveTextContent(/capped/);
  });

  it("labels the code's line 'capped at N%' when the store-wide cap trims it", async () => {
    checkCodeAction.mockResolvedValue({ ok: true, kind: "discount", code: "BIG40", capPct: 30,
      terms: { kind: "order_pct", value: 40, stackOnTop: true, freeShipping: false, minOrderCents: null, includeSlugs: [], excludeSlugs: [], includeClasses: [], excludeClasses: [] } });
    renderForm({ initialCode: "BIG40" });
    expect(await screen.findByRole("status")).toHaveTextContent("capped at 30% of list price");
    expect(screen.getByText(/Includes discount code BIG40/)).toHaveTextContent("Includes discount code BIG40 (capped at 30%)");
  });

  it("shows the bigger-discount note when the code saves nothing", async () => {
    checkCodeAction.mockResolvedValue({ ok: true, kind: "discount", code: "TEN", capPct: 30,
      terms: { kind: "item_pct", value: 10, stackOnTop: false, freeShipping: false, minOrderCents: null, includeSlugs: [], excludeSlugs: [], includeClasses: [], excludeClasses: [] } });
    renderForm({ initialCode: "TEN", newAccountOffer: { endsAt: "2026-10-18T00:00:00Z" } });
    expect(await screen.findByRole("status")).toHaveTextContent("is already larger than this code");
  });
});
