import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const startWholesaleCheckoutAction = vi.fn();
vi.mock("@/app/wholesale/actions", () => ({ startWholesaleCheckoutAction }));
vi.mock("@/components/account/HumanCheck", () => ({ default: ({ onToken }: { onToken: (t: string) => void }) => <button type="button" onClick={() => onToken("tok")}>pass check</button> }));

const art = { cap: "red" as const, vialLabel: "X" };
const rows = [
  { slug: "retatrutide", name: "Retatrutide", designation: "APro-G3RT", chemicalClass: "Incretin & Amylin Analogs", variantId: "10mg", strength: "10 mg", priceUsd: 125, art },
  { slug: "bpc-157", name: "BPC-157", designation: null, chemicalClass: "Peptide Fragments", variantId: "10mg", strength: "10 mg", priceUsd: 65, art },
  { slug: "tb-500", name: "TB-500", designation: null, chemicalClass: "Peptide Fragments", variantId: "10mg", strength: "10 mg", priceUsd: 90, art },
];
const pricing = { tiers: [{ minKits: 5, pct: 20 }, { minKits: 10, pct: 25 }, { minKits: 20, pct: 30 }], depositPct: 40, minKits: 5 };
const ship = { name: "Dana", line1: "1 Elm", line2: null, city: "Boulder", state: "CO", zip: "80302" };

async function sheet() {
  const { default: Sheet } = await import("@/components/store/wholesale/WholesaleOrderSheet");
  render(<Sheet rows={rows} pricing={pricing} cutoffLabel="Oct 19" ship={ship} email="d@lab.org" />);
}

describe("WholesaleOrderSheet", () => {
  beforeEach(() => { vi.resetModules(); startWholesaleCheckoutAction.mockReset(); });

  it("groups strengths by class, shows the APro designation with the scientific name, and no lot-test charge", async () => {
    await sheet();
    expect(screen.getByText("Incretin & Amylin Analogs")).toBeTruthy();
    expect(screen.getByText("APro-G3RT", { selector: ".s-ws-nm" })).toBeTruthy();
    expect(screen.getByText("· Retatrutide · 10 mg")).toBeTruthy();
    expect(screen.queryByText(/lot test/i)).toBeNull();
    expect(screen.getByText(/Every batch is independently tested/)).toBeTruthy();
  });

  it("a checkbox adds one kit; checkout stays locked until the 5-kit minimum", async () => {
    await sheet();
    fireEvent.click(screen.getByRole("checkbox", { name: "Order BPC-157 10 mg kits" }));
    expect(screen.getByTestId("ws-count").textContent).toBe("1 kit · 10 vials");
    expect(screen.getByText("4 more kits to reach the 5-kit minimum")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Minimum 5 kits" }) as HTMLButtonElement).disabled).toBe(true);
    for (let i = 0; i < 2; i++) fireEvent.click(screen.getByRole("button", { name: "Add a BPC-157 10 mg kit" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Order TB-500 10 mg kits" }));
    fireEvent.click(screen.getByRole("button", { name: "Add a TB-500 10 mg kit" }));
    // 3 x $520 + 2 x $720 = $3,000 at 20% off; deposit 40%
    expect(screen.getByTestId("ws-count").textContent).toBe("5 kits · 50 vials · 20% off");
    expect(screen.getByText("5 more kits for 25% off")).toBeTruthy();
    expect(screen.getByTestId("ws-deposit").textContent).toBe("$1,200.00");
    expect((screen.getByRole("button", { name: "Continue to checkout" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("unticking removes the strength", async () => {
    await sheet();
    const cb = screen.getByRole("checkbox", { name: "Order APro-G3RT 10 mg kits" });
    fireEvent.click(cb);
    fireEvent.click(cb);
    expect(screen.getByTestId("ws-count").textContent).toBe("0 kits · 0 vials");
  });

  it("checkout: human check, then Pay deposit sends the kits and address to the server", async () => {
    startWholesaleCheckoutAction.mockResolvedValue({ error: "Card declined" });
    await sheet();
    fireEvent.click(screen.getByRole("checkbox", { name: "Order BPC-157 10 mg kits" }));
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByRole("button", { name: "Add a BPC-157 10 mg kit" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue to checkout" }));
    const pay = screen.getByRole("button", { name: /Pay deposit \$1,040\.00/ }) as HTMLButtonElement;
    expect(pay.disabled).toBe(true);
    fireEvent.click(screen.getByText("pass check"));
    fireEvent.click(screen.getByRole("checkbox", { name: /laboratory research use only/ }));
    fireEvent.click(screen.getByRole("button", { name: /Pay deposit/ }));
    await screen.findByText("Card declined");
    expect(startWholesaleCheckoutAction).toHaveBeenCalledWith(expect.objectContaining({
      lines: [{ slug: "bpc-157", variantId: "10mg", kits: 5 }], ruoConfirmed: true, humanToken: "tok",
      ship: expect.objectContaining({ name: "Dana", zip: "80302" }),
    }));
  });
});
