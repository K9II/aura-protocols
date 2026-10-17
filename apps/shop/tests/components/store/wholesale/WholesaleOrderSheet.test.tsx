import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

const startWholesaleCheckoutAction = vi.fn();
vi.mock("@/app/wholesale/actions", () => ({ startWholesaleCheckoutAction }));
vi.mock("@/components/account/HumanCheck", () => ({ default: ({ onToken }: { onToken: (t: string) => void }) => <button type="button" onClick={() => onToken("tok")}>pass check</button> }));

const art = { cap: "red" as const, vialLabel: "X" };
const rows = [
  { slug: "retatrutide", name: "Retatrutide", designation: "APro-G3RT", chemicalClass: "Incretin & Amylin Analogs", variantId: "10mg", strength: "10 mg", priceUsd: 125, art },
  { slug: "bpc-157", name: "BPC-157", designation: null, chemicalClass: "Peptide Fragments", variantId: "10mg", strength: "10 mg", priceUsd: 65, art },
  { slug: "tb-500", name: "TB-500", designation: null, chemicalClass: "Peptide Fragments", variantId: "10mg", strength: "10 mg", priceUsd: 90, art },
];
const pricing = { tiers: [{ minKits: 5, pct: 25 }, { minKits: 10, pct: 30 }, { minKits: 20, pct: 35 }], depositPct: 40, minKits: 5 };
const ship = { name: "Dana", line1: "1 Elm", line2: null, city: "Boulder", state: "CO", zip: "80302" };

async function sheet() {
  const { default: Sheet } = await import("@/components/store/wholesale/WholesaleOrderSheet");
  render(<Sheet rows={rows} pricing={pricing} cutoffLabel="Oct 19" nextCutoffLabel="Nov 2" ship={ship} email="d@lab.org" />);
}

describe("WholesaleOrderSheet", () => {
  beforeEach(() => { vi.resetModules(); startWholesaleCheckoutAction.mockReset(); });

  it("groups strengths by class, shows the APro designation with the scientific name, and no lot-test charge", async () => {
    await sheet();
    expect(screen.getByText("Incretin & Amylin Analogs", { selector: ".s-wo-cls" })).toBeTruthy();
    expect(screen.getByText("APro-G3RT", { selector: ".s-ws-nm" })).toBeTruthy();
    expect(screen.getByText("Retatrutide · 10 mg · 10 vials")).toBeTruthy();
    expect(screen.queryByText(/lot test/i)).toBeNull();
    // each class is its own panel, every strength starts with an Add kit button (no checkboxes)
    expect(screen.getByRole("region", { name: "Peptide Fragments" })).toBeTruthy();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("Add kit adds one kit; checkout stays locked until the 5-kit minimum", async () => {
    await sheet();
    fireEvent.click(screen.getByRole("button", { name: "Add a BPC-157 10 mg kit" }));
    expect(screen.getByTestId("ws-count").textContent).toBe("1 kit · 10 vials");
    expect(screen.getByText("4 more kits to reach the 5-kit minimum")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Minimum 5 kits" }) as HTMLButtonElement).disabled).toBe(true);
    for (let i = 0; i < 2; i++) fireEvent.click(screen.getByRole("button", { name: "Add a BPC-157 10 mg kit" }));
    fireEvent.click(screen.getByRole("button", { name: "Add a TB-500 10 mg kit" }));
    fireEvent.click(screen.getByRole("button", { name: "Add a TB-500 10 mg kit" }));
    // 3 x $487.50 + 2 x $675 = $2,812.50 at 25% off; deposit 40%
    expect(screen.getByTestId("ws-count").textContent).toBe("5 kits · 50 vials · 25% off");
    expect(screen.getByText("5 more kits for 30% off")).toBeTruthy();
    expect(screen.getByTestId("ws-deposit").textContent).toBe("$1,125.00");
    expect((screen.getByRole("button", { name: "Continue to checkout" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("the kit count can be typed (20 kits without 20 clicks); clearing it and leaving removes the strength", async () => {
    await sheet();
    fireEvent.click(screen.getByRole("button", { name: "Add a BPC-157 10 mg kit" }));
    const box = screen.getByRole("textbox", { name: "BPC-157 10 mg kits" }) as HTMLInputElement;
    fireEvent.change(box, { target: { value: "20" } });
    expect(screen.getByTestId("ws-count").textContent).toBe("20 kits · 200 vials · 35% off");
    fireEvent.change(box, { target: { value: "2a" } });   // digits only
    expect(screen.getByTestId("ws-count").textContent).toBe("2 kits · 20 vials");
    fireEvent.change(box, { target: { value: "" } });     // mid-edit: the box stays
    expect(screen.getByRole("textbox", { name: "BPC-157 10 mg kits" })).toBeTruthy();
    fireEvent.blur(box);
    expect(screen.getByTestId("ws-count").textContent).toBe("0 kits · 0 vials");
    expect(screen.getByRole("button", { name: "Add a BPC-157 10 mg kit" }).textContent).toBe("+ Add kit");
  });

  it("class filter shows one class at a time; kits in other classes stay in the order", async () => {
    await sheet();
    fireEvent.click(screen.getByRole("button", { name: "Add a APro-G3RT 10 mg kit" }));
    fireEvent.click(screen.getByRole("button", { name: "Peptide Fragments" }));
    expect(screen.queryByRole("region", { name: "Incretin & Amylin Analogs" })).toBeNull();
    expect(screen.getByRole("region", { name: "Peptide Fragments" })).toBeTruthy();
    expect(screen.getByTestId("ws-count").textContent).toBe("1 kit · 10 vials");
    fireEvent.click(screen.getByRole("button", { name: "All 3" }));
    expect(screen.getByRole("region", { name: "Incretin & Amylin Analogs" })).toBeTruthy();
  });

  it("removing the last kit brings the Add kit button back", async () => {
    await sheet();
    fireEvent.click(screen.getByRole("button", { name: "Add a APro-G3RT 10 mg kit" }));
    expect(screen.getByText("Line $937.50")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Remove a APro-G3RT 10 mg kit" }));
    expect(screen.getByTestId("ws-count").textContent).toBe("0 kits · 0 vials");
    expect(screen.getByRole("button", { name: "Add a APro-G3RT 10 mg kit" }).textContent).toBe("+ Add kit");
  });

  it("checkout: human check, then Pay deposit sends the kits and address to the server", async () => {
    startWholesaleCheckoutAction.mockResolvedValue({ error: "Card declined" });
    await sheet();
    fireEvent.click(screen.getByRole("button", { name: "Add a BPC-157 10 mg kit" }));
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByRole("button", { name: "Add a BPC-157 10 mg kit" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue to checkout" }));
    // the custom-request form is hidden on this step (CSS :has(.s-wo-co)); the button says what's missing
    expect((screen.getByRole("button", { name: "Complete the human check" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByText("pass check"));
    expect((screen.getByRole("button", { name: "Confirm research use" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("checkbox", { name: /laboratory research use only/ }));
    expect(screen.getByRole("button", { name: /Pay deposit \$975\.00/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Pay deposit/ }));
    await screen.findByText("Card declined");
    expect(startWholesaleCheckoutAction).toHaveBeenCalledWith(expect.objectContaining({
      lines: [{ slug: "bpc-157", variantId: "10mg", kits: 5 }], ruoConfirmed: true, humanToken: "tok",
      ship: expect.objectContaining({ name: "Dana", zip: "80302" }),
    }));
  });

  it("from 40 kits it counts down to a volume quote; at 50 it offers one and hands the sheet to the form", async () => {
    await sheet();
    fireEvent.click(screen.getByRole("button", { name: "Add a BPC-157 10 mg kit" }));
    for (let i = 1; i < 42; i++) fireEvent.click(screen.getByRole("button", { name: "Add a BPC-157 10 mg kit" }));
    expect(screen.getByText("8 more kits and you can ask for a volume quote")).toBeTruthy();
    expect(screen.queryByTestId("ws-volume-quote")).toBeNull();
    // under the threshold: the page's quote section stays hidden (CSS keys on .s-wo-q) and the 35% tag is lit
    expect(document.querySelector(".s-wo-grid")!.classList.contains("s-wo-q")).toBe(false);
    expect(document.querySelector(".s-ws-tiers .on")!.textContent).toMatch(/35%/);
    fireEvent.click(screen.getByRole("button", { name: "Add a TB-500 10 mg kit" }));
    for (let i = 1; i < 8; i++) fireEvent.click(screen.getByRole("button", { name: "Add a TB-500 10 mg kit" }));
    expect(screen.getByTestId("ws-count").textContent).toBe("50 kits · 500 vials · 35% off");
    expect(screen.getByTestId("ws-volume-quote").textContent).toContain("This order qualifies for a volume quote.");
    // 50+: the quote section shows and the highlight moves to the "Volume quote" tag
    expect(document.querySelector(".s-wo-grid")!.classList.contains("s-wo-q")).toBe(true);
    expect([...document.querySelectorAll(".s-ws-tiers .on")].map((e) => e.textContent)).toEqual([expect.stringMatching(/Volume quote/)]);
    const seen: string[] = [];
    const on = (e: Event) => seen.push((e as CustomEvent<string>).detail);
    window.addEventListener("aura:volume-quote", on);
    fireEvent.click(screen.getByRole("link", { name: "Ask for a volume quote →" }));
    window.removeEventListener("aura:volume-quote", on);
    expect(seen).toEqual(["Volume quote request (50 kits):\n- BPC-157 10 mg: 42 kits\n- TB-500 10 mg: 8 kits"]);
    // checkout stays open: the quote is an offer, not a gate
    expect((screen.getByRole("button", { name: "Continue to checkout" }) as HTMLButtonElement).disabled).toBe(false);
  });

  async function askAt50(first = "BPC-157") {
    await sheet();
    for (let i = 0; i < 42; i++) fireEvent.click(screen.getByRole("button", { name: `Add a ${first} 10 mg kit` }));
    for (let i = 0; i < 8; i++) fireEvent.click(screen.getByRole("button", { name: "Add a TB-500 10 mg kit" }));
    let message = "";
    const on = (e: Event) => { message = (e as CustomEvent<string>).detail; };
    window.addEventListener("aura:volume-quote", on);
    fireEvent.click(screen.getByRole("link", { name: "Ask for a volume quote →" }));
    window.removeEventListener("aura:volume-quote", on);
    return message;
  }
  const sent = (detail: { ref: string | null; name: string; message: string }) =>
    act(() => { window.dispatchEvent(new CustomEvent("aura:volume-quote-sent", { detail })); });

  it("after the handed-over request is sent, Quote requested replaces the sheet; Order now puts the kits back", async () => {
    const message = await askAt50();
    sent({ ref: "Q-1007", name: "Dana Reyes", message: message.replace(/\n/g, "\r\n") });
    const page = screen.getByTestId("ws-quote-requested");
    expect(page.textContent).toContain("Thanks, Dana. Your request is Q-1007");
    expect(page.textContent).toContain("d@lab.org");
    expect(page.textContent).toContain("within 2 business days");
    expect(page.textContent).toContain("pay the 40% deposit by bank transfer or card");
    expect(page.textContent).toContain("the run closing Oct 19; after that, the next one closes Nov 2");
    expect(screen.getByTestId("ws-quote-requested-count").textContent).toBe("50 kits · 500 vials");
    expect(page.textContent).toContain("BPC-157");
    expect(page.textContent).toContain("42 kits");
    expect(page.textContent).toContain("Order these kits now at the listed price: 35% off for 20+ kits.");
    expect(screen.queryByTestId("ws-count")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^Order now at the listed price/ }));
    expect(screen.getByTestId("ws-count").textContent).toBe("50 kits · 500 vials · 35% off");
  });

  it("an edited request, or one never handed over, leaves the sheet as it is", async () => {
    const message = await askAt50();
    sent({ ref: "Q-1008", name: "Dana", message: message + "\nAlso 5 kits of something custom" });
    expect(screen.queryByTestId("ws-quote-requested")).toBeNull();
    expect(screen.getByTestId("ws-count").textContent).toBe("50 kits · 500 vials · 35% off");
  });

  it("with an incretin analog in the request, the deposit is by bank transfer only", async () => {
    const message = await askAt50("APro-G3RT");
    sent({ ref: null, name: "", message });
    const page = screen.getByTestId("ws-quote-requested");
    expect(page.textContent).toContain("Thanks. A copy is in your inbox");
    expect(page.textContent).toContain("pay the 40% deposit by bank transfer. ");
    expect(page.textContent).toContain("Retatrutide");
  });
});
