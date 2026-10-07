import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import type { NoChargeState } from "@/app/admin/orders/actions";

const m = vi.hoisted(() => ({ action: vi.fn(async (): Promise<NoChargeState> => null) }));
vi.mock("@/app/admin/orders/actions", () => ({ createNoChargeOrderAction: m.action }));
import NoChargeForm from "@/components/admin/orders/NoChargeForm";

const C1 = "11111111-1111-4111-8111-111111111111";
const ship = { name: "Dana Whitfield", line1: "418 E Speedway Blvd", line2: null, city: "Tucson", state: "AZ" as const, zip: "85705" };
const customer = { id: C1, name: "Dana Whitfield", email: "dana.w@example.com", verified: true, blocked: false, agreedAt: "2026-09-01T00:00:00Z", ship };
const stock = [
  { slug: "bpc-157", variantId: "10mg", name: "BPC-157", strength: "10 mg", priceCents: 4800, available: 84, hidden: false },
  { slug: "mots-c", variantId: "40mg", name: "MOTS-c", strength: "40 mg", priceCents: 9600, available: 6, hidden: true },
];
const originals = [{ number: "AP-1052", createdAt: "2026-10-01T18:00:00Z" }];
const month = { orders: 4, retailCents: 61_200 };

function setup(o: Partial<{ customer: typeof customer }> = {}) {
  const r = render(<NoChargeForm customer={o.customer ?? customer} stock={stock} originals={originals} month={month} submitKey="key-1" recipientCard={<div>card</div>} />);
  const form = r.container.querySelector("form")!;
  return { ...r, form, data: () => new FormData(form) };
}
const reason = (name: string) => fireEvent.click(screen.getByRole("radio", { name }));
const pick = (row: number, value: string) => fireEvent.change(screen.getAllByRole("combobox", { name: "Product · strength" })[row], { target: { value } });
const vials = (row: number, n: string) => fireEvent.change(screen.getAllByRole("spinbutton", { name: "Vials" })[row], { target: { value: n } });

describe("NoChargeForm", () => {
  beforeEach(() => { m.action.mockReset(); m.action.mockResolvedValue(null); });

  it("posts the customer, reason, lines and saved address", () => {
    const { data } = setup();
    expect(data().get("customer")).toBe(C1);
    reason("Seeding");
    pick(0, "bpc-157:10mg"); vials(0, "2");
    fireEvent.click(screen.getByRole("button", { name: "Add item" }));
    pick(1, "mots-c:40mg"); vials(1, "1");
    const d = data();
    expect(d.get("reason")).toBe("seeding");
    expect(d.getAll("line")).toEqual(["bpc-157:10mg:2", "mots-c:40mg:1"]);
    expect(d.get("ship_name")).toBe("Dana Whitfield");
    expect(d.get("ship_line1")).toBe("418 E Speedway Blvd");
    expect(d.get("ship_city")).toBe("Tucson");
    expect(d.get("ship_state")).toBe("AZ");
    expect(d.get("ship_zip")).toBe("85705");
  });

  it("pre-selects Replacement and the original order (Send a replacement)", () => {
    const r = render(<NoChargeForm customer={customer} stock={stock} originals={originals} month={month} submitKey="key-1" recipientCard={<div>card</div>} initialReason="replacement" initialReplaces="AP-1052" />);
    const d = new FormData(r.container.querySelector("form")!);
    expect(screen.getByRole("radio", { name: "Replacement" })).toBeChecked();
    expect(d.get("reason")).toBe("replacement");
    expect(d.get("replaces")).toBe("AP-1052");
    expect(screen.getByRole("combobox", { name: "Original order" })).toHaveDisplayValue(/AP-1052/);
  });

  it("labels options with stock, tags hidden strengths and shows Retail", () => {
    setup();
    expect(screen.getByRole("option", { name: "BPC-157 · 10 mg — 84 available" })).toBeInTheDocument();
    pick(0, "mots-c:40mg");
    expect(screen.getByText("Hidden")).toBeInTheDocument();
    expect(screen.getAllByText("$96.00").length).toBeGreaterThan(0);
  });

  it("Remove drops a line", () => {
    const { data } = setup();
    pick(0, "bpc-157:10mg"); vials(0, "2");
    fireEvent.click(screen.getByRole("button", { name: "Add item" }));
    pick(1, "mots-c:40mg");
    fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[0]);
    expect(data().getAll("line")).toEqual(["mots-c:40mg:1"]);
  });

  it("shows Original order and a required Note only for Replacement", () => {
    const { data } = setup();
    reason("Seeding");
    expect(screen.queryByRole("combobox", { name: "Original order" })).toBeNull();
    expect(screen.getByLabelText(/^Note/)).toBeInTheDocument();
    expect(screen.queryByText("(required)")).toBeNull();
    reason("Replacement");
    const sel = screen.getByRole("combobox", { name: "Original order" });
    expect(within(sel).getByRole("option", { name: "AP-1052 · Oct 1" })).toBeInTheDocument();
    expect(screen.getByText("(required)")).toBeInTheDocument();
    fireEvent.change(sel, { target: { value: "AP-1052" } });
    expect(data().get("replaces")).toBe("AP-1052");
    reason("Other");
    expect(screen.getByText("(required)")).toBeInTheDocument();
  });

  it("summary adds vials and retail; nothing is charged", () => {
    setup();
    pick(0, "bpc-157:10mg"); vials(0, "2");
    fireEvent.click(screen.getByRole("button", { name: "Add item" }));
    pick(1, "mots-c:40mg"); vials(1, "1");
    const sum = screen.getByRole("heading", { name: "Summary" }).closest(".a-card") as HTMLElement;
    expect(within(sum).getByText("Vials").nextSibling).toHaveTextContent("3");
    expect(within(sum).getByText("Retail value").nextSibling).toHaveTextContent("$192.00");
    expect(within(sum).getByText("Shipping").nextSibling).toHaveTextContent("$0.00");
    expect(within(sum).getByText("Charged").nextSibling).toHaveTextContent("$0.00");
    expect(screen.getByText(/3 vials are taken from stock now/)).toBeInTheDocument();
    expect(screen.getByText("This month: 4 no-charge orders · $612.00 at retail")).toBeInTheDocument();
    expect(screen.getByText("3 vials · $192.00 retail")).toBeInTheDocument();
  });

  it("the email box follows the reason until touched", () => {
    const { data } = setup();
    const box = screen.getByRole("checkbox", { name: /Email Dana that it's on its way/ });
    reason("Seeding");
    expect(box).toBeChecked();
    expect(data().get("email")).toBe("on");
    reason("Sample");
    expect(box).not.toBeChecked();
    expect(data().get("email")).toBeNull();
    reason("Replacement");
    expect(box).toBeChecked();
    fireEvent.click(box);
    expect(box).not.toBeChecked();
    reason("Seeding");
    expect(box).not.toBeChecked();
  });

  it("Edit reveals the address fields with the saved address", () => {
    const { data } = setup();
    expect(screen.queryByLabelText("City")).toBeNull();
    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    const city = screen.getByLabelText("City");
    expect(city).toHaveValue("Tucson");
    fireEvent.change(city, { target: { value: "Phoenix" } });
    expect(data().get("ship_city")).toBe("Phoenix");
    expect(data().getAll("ship_city")).toHaveLength(1);
  });

  it("asks for an address when none is saved", () => {
    setup({ customer: { ...customer, ship: null as unknown as typeof ship } });
    expect(screen.getByLabelText("City")).toHaveValue("");
    expect(screen.getByLabelText("Name")).toHaveValue("Dana Whitfield");
  });

  it("renders errors under their fields and the form error above Create", async () => {
    m.action.mockResolvedValue({ errors: { reason: "Pick a reason.", note: "Say what happened.", replaces: "Pick the original order.", lines: "Add at least one item.", form: "Please complete the shipping address." } });
    const { form } = setup();
    reason("Replacement");
    fireEvent.submit(form);
    expect(await screen.findByText("Pick a reason.")).toBeInTheDocument();
    for (const t of ["Say what happened.", "Pick the original order.", "Add at least one item.", "Please complete the shipping address."]) {
      expect(screen.getByText(t)).toBeInTheDocument();
    }
    expect(m.action).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole("button", { name: "Create order" }).length).toBeGreaterThan(0);
  });

  it("posts the page's one-time key, and the fresh one the action sends back after a failure", async () => {
    m.action.mockResolvedValue({ errors: { form: "Stock couldn't be reserved. Nothing was sent — try again." }, key: "key-2" });
    const { form, data } = setup();
    expect(data().get("key")).toBe("key-1");
    fireEvent.submit(form);
    expect(await screen.findByText("Stock couldn't be reserved. Nothing was sent — try again.")).toBeInTheDocument();
    expect(data().get("key")).toBe("key-2");
  });
});
