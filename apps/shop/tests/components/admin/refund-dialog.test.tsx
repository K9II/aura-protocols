import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { RefundState } from "@/app/admin/orders/actions";

const m = vi.hoisted(() => ({ action: vi.fn(async (): Promise<RefundState> => null) }));
vi.mock("@/app/admin/orders/actions", () => ({ refundOrderAction: m.action }));
import RefundDialog, { type RefundDialogProps } from "@/components/admin/orders/RefundDialog";

// jsdom has no showModal; the open attribute is enough here.
HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };

// AP-1052: $188.00 card + $40.00 store credit (mock r2 left).
const cancel: RefundDialogProps = {
  dialogId: "refund-o1", orderId: "o1", orderNumber: "AP-1052", mode: "cancel", firstName: "Dana", vials: 3,
  commission: "The LABNOTES commission ($19.20) is reversed.",
  splits: {
    card: { cardCents: 18_800, creditBackCents: 4_000, cardToCreditCents: 0, totalCents: 22_800 },
    store_credit: { cardCents: 0, creditBackCents: 4_000, cardToCreditCents: 18_800, totalCents: 22_800 },
  },
  paymentLabel: "Visa ••4242", replaceHref: "/admin/orders/new?customer=c1&reason=replacement&replaces=AP-1052", button: true,
};
// AP-1047 shipped, $268.00 all on the card (mock r3).
const exception: RefundDialogProps = {
  ...cancel, dialogId: "refund-o2", orderId: "o2", orderNumber: "AP-1047", mode: "exception", firstName: "Jordan", vials: 4,
  commission: "The QUINN10 commission ($21.40) is reversed.",
  splits: {
    card: { cardCents: 26_800, creditBackCents: 0, cardToCreditCents: 0, totalCents: 26_800 },
    store_credit: { cardCents: 0, creditBackCents: 0, cardToCreditCents: 26_800, totalCents: 26_800 },
  },
  paymentLabel: "Visa ••1881", replaceHref: "/admin/orders/new?customer=c2&reason=replacement&replaces=AP-1047", button: false,
};

const dialog = (c: HTMLElement) => c.querySelector("dialog") as HTMLDialogElement;
const data = (c: HTMLElement) => new FormData(c.querySelector("form")!);

describe("RefundDialog — Cancel and refund (r2)", () => {
  beforeEach(() => { m.action.mockReset(); m.action.mockResolvedValue(null); });

  it("the header button opens it; lines, facts, reason default and buttons", () => {
    const { container } = render(<RefundDialog {...cancel} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel and refund" }));
    const d = dialog(container);
    expect(d).toHaveAttribute("open");
    expect(d).toHaveAttribute("id", "refund-o1");
    expect(within(d).getByRole("heading")).toHaveTextContent("Cancel and refund AP-1052?");
    const lines = d.querySelector(".a-refund-lines") as HTMLElement;
    expect(lines).toHaveTextContent("Back to Visa ••4242usually 5–10 business days, depending on the bank$188.00");
    expect(lines).toHaveTextContent("Back to Dana's store creditavailable right away$40.00");
    expect(lines).toHaveTextContent("Refunded in full$228.00");
    const facts = within(d.querySelector(".a-rfacts") as HTMLElement).getAllByRole("listitem").map((li) => li.textContent);
    expect(facts).toEqual(["3 vials go back to stock.", "The LABNOTES commission ($19.20) is reversed.", "Dana gets the \"cancelled and refunded\" email."]);
    expect(within(d).getByRole("combobox", { name: "Reason" })).toHaveDisplayValue("Customer asked to cancel");
    expect(within(d).getByLabelText(/Note/)).toHaveAttribute("placeholder", "e.g. \"Ordered the wrong strength — Q-1049\"");
    expect(within(d).getByText("(optional — only you see it)")).toBeInTheDocument();
    expect(within(d).getByRole("button", { name: "Keep order" })).toBeInTheDocument();
    expect(within(d).getByRole("button", { name: "Cancel and refund $228.00" })).toHaveAttribute("type", "submit");
    const f = data(container);
    expect(f.get("orderId")).toBe("o1");
    expect(f.get("mode")).toBe("cancel");
    expect(f.get("destination")).toBe("card");
    expect(f.get("reason")).toBe("customer_cancelled");
  });

  it("a credit-only order: one store credit line, destination store_credit", () => {
    const credit = { cardCents: 0, creditBackCents: 13_750, cardToCreditCents: 0, totalCents: 13_750 };
    const { container } = render(<RefundDialog {...cancel} orderNumber="AP-1044" firstName="Marcus" vials={2} commission="No partner on this order." paymentLabel={null} splits={{ card: credit, store_credit: credit }} />);
    const lines = container.querySelector(".a-refund-lines") as HTMLElement;
    expect(within(lines).queryByText(/Back to Visa/)).toBeNull();
    expect(lines).toHaveTextContent("Back to Marcus's store creditpaid fully with store credit · available right away$137.50");
    expect(screen.getByText("No partner on this order.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel and refund $137.50", hidden: true })).toBeInTheDocument();
    expect(data(container).get("destination")).toBe("store_credit");
  });

  it("a form error is the red banner with only Close (r5 right)", async () => {
    m.action.mockResolvedValue({ errors: { form: "Stripe didn't refund AP-1052: Charge ch_3Q8x has already been refunded. Nothing changed here — reload the page." } });
    const { container } = render(<RefundDialog {...cancel} />);
    await act(async () => { fireEvent.submit(container.querySelector("form")!); });
    const banner = container.querySelector(".a-err-banner") as HTMLElement;
    expect(banner).toHaveTextContent("Stripe didn't refund AP-1052");
    expect(banner).toHaveAttribute("role", "alert");
    expect(container.querySelector(".a-refund-lines")).toHaveTextContent("Refunded in full$228.00");
    expect(within(container.querySelector(".a-modal-f") as HTMLElement).getAllByRole("button", { hidden: true }).map((b) => b.textContent)).toEqual(["Close"]);
    expect(screen.queryByRole("button", { name: /Cancel and refund \$/, hidden: true })).toBeNull();
  });

  it("closes on ok", async () => {
    m.action.mockResolvedValue({ ok: "AP-1052 was refunded." });
    const { container } = render(<RefundDialog {...cancel} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel and refund" }));
    expect(dialog(container)).toHaveAttribute("open");
    await act(async () => { fireEvent.submit(container.querySelector("form")!); });
    expect(m.action).toHaveBeenCalled();
    expect(dialog(container)).not.toHaveAttribute("open");
  });
});

describe("RefundDialog — shipped exception (r3)", () => {
  beforeEach(() => { m.action.mockReset(); m.action.mockResolvedValue(null); });

  it("no header button; policy callout with the replacement link; store credit by default", () => {
    const { container } = render(<RefundDialog {...exception} />);
    expect(screen.queryByRole("button", { name: "Cancel and refund" })).toBeNull();
    const d = dialog(container);
    expect(within(d).getByRole("heading", { hidden: true })).toHaveTextContent("Refund AP-1047? It has shipped.");
    expect(d.querySelector(".a-callout.warn")).toHaveTextContent("Your policy: after shipping the sale is final. Lost or damaged items get a free replacement, not cash.");
    expect(within(d).getByRole("link", { name: "Send a replacement instead", hidden: true })).toHaveAttribute("href", exception.replaceHref);
    const credit = within(d).getByRole("radio", { name: /Store credit/, hidden: true });
    expect(credit).toBeChecked();
    expect(credit.closest("label")).toHaveTextContent("$268.00 to Jordan's balance · the card charge stays");
    expect(within(d).getByRole("radio", { name: /Visa ••1881/, hidden: true }).closest("label")).toHaveTextContent("$268.00 back to the card");
    expect(within(d).getByText("(required)")).toBeInTheDocument();
    const facts = within(d.querySelector(".a-rfacts") as HTMLElement).getAllByRole("listitem", { hidden: true }).map((li) => li.textContent);
    expect(facts).toEqual(["Vials stay out of stock — they've shipped.", "The QUINN10 commission ($21.40) is reversed.", "Jordan gets a \"refunded\" email with the amount and where it went."]);
    expect(within(d).getByRole("checkbox", { name: "I'm making an exception to the refund policy for this order.", hidden: true })).not.toBeChecked();
    expect(within(d).getByRole("button", { name: "Refund $268.00 to store credit", hidden: true })).toBeInTheDocument();
    const f = data(container);
    expect(f.get("mode")).toBe("exception");
    expect(f.get("destination")).toBe("store_credit");
    expect(f.get("reason")).toBe("");
  });

  it("the button follows the destination", () => {
    render(<RefundDialog {...exception} />);
    fireEvent.click(screen.getByRole("radio", { name: /Visa ••1881/, hidden: true }));
    expect(screen.getByRole("button", { name: "Refund $268.00 to Visa ••1881", hidden: true })).toBeInTheDocument();
  });

  it("disables the card option with no card payment", () => {
    render(<RefundDialog {...exception} paymentLabel={null} />);
    const card = screen.getByRole("radio", { name: /Card/, hidden: true });
    expect(card).toBeDisabled();
    expect(card.closest("label")).toHaveTextContent("No card payment on this order");
    expect(screen.getByRole("radio", { name: /Store credit/, hidden: true }).closest("label")).toHaveTextContent("$268.00 to Jordan's balance");
    expect(screen.getByRole("radio", { name: /Store credit/, hidden: true }).closest("label")).not.toHaveTextContent("card charge stays");
  });

  it("shows field errors under their fields", async () => {
    m.action.mockResolvedValue({ errors: { reason: "Pick a reason.", note: "Say why this order is an exception.", confirm: "Tick the box to confirm the exception.", destination: "Pick where the money goes." } });
    const { container } = render(<RefundDialog {...exception} />);
    await act(async () => { fireEvent.submit(container.querySelector("form")!); });
    const alerts = screen.getAllByRole("alert", { hidden: true }).map((a) => a.textContent);
    expect(alerts).toEqual(["Pick where the money goes.", "Pick a reason.", "Say why this order is an exception.", "Tick the box to confirm the exception."]);
    expect(container.querySelector(".a-err-banner")).toBeNull();
  });

  it("keeps what was typed after an error (React resets uncontrolled fields)", async () => {
    m.action.mockResolvedValue({ errors: { destination: "Pick where the money goes." } });
    const { container } = render(<RefundDialog {...exception} />);
    const d = dialog(container);
    fireEvent.change(within(d).getByRole("combobox", { name: "Reason", hidden: true }), { target: { value: "damaged" } });
    fireEvent.change(within(d).getByLabelText(/Note/), { target: { value: "Two vials cracked" } });
    fireEvent.click(within(d).getByRole("checkbox", { hidden: true }));
    await act(async () => { fireEvent.submit(container.querySelector("form")!); });
    expect(screen.getByText("Pick where the money goes.")).toBeInTheDocument();
    const f = data(container);
    expect([f.get("reason"), f.get("note"), f.get("confirm"), (within(d).getByRole("combobox", { name: "Reason", hidden: true }) as HTMLSelectElement).value]).toEqual(["damaged", "Two vials cracked", "on", "damaged"]);
  });

  it("reason, note and the policy box are required in the browser", () => {
    const { container } = render(<RefundDialog {...exception} />);
    const d = dialog(container);
    expect(within(d).getByRole("combobox", { name: "Reason", hidden: true })).toBeRequired();
    expect(within(d).getByLabelText(/Note/)).toBeRequired();
    expect(within(d).getByRole("checkbox", { hidden: true })).toBeRequired();
  });

  it("before shipping the note stays optional", () => {
    const { container } = render(<RefundDialog {...cancel} />);
    expect(within(dialog(container)).getByLabelText(/Note/)).not.toBeRequired();
  });
});
