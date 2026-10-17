import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const cancelQuoteRequestAction = vi.fn();
const orderNowAtSheetPriceAction = vi.fn();
const refresh = vi.fn();
vi.mock("@/app/order/quote-actions", () => ({ cancelQuoteRequestAction, orderNowAtSheetPriceAction }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const items = [
  { key: "a", chemicalClass: "Mitochondrial & Metabolic", title: "SS-31", scientific: "Elamipretide", strength: "50 mg", kits: 20 },
  { key: "b", chemicalClass: "Blends", title: "GLOW", scientific: "BPC-157 / TB-500 / GHK-Cu", strength: "70 mg", kits: 20 },
];
const props = {
  orderNumber: "AP-1063", firstName: "Dana", email: "d@lab.org", inquiryRef: "Q-1009", requestedLabel: "Oct 17", priceByLabel: "11:39 pm MT", late: false,
  cutoffLabel: "Oct 19", nextCutoffLabel: "Nov 2", shipsAboutLabel: "Nov 10", depositPct: 40, cardAllowed: true, items, sheetPct: 40, sheetMinKits: 20,
};

async function page(over: Partial<typeof props> = {}) {
  const { default: P } = await import("@/components/store/wholesale/QuoteRequestPage");
  render(<P {...props} {...over} />);
  return screen.getByTestId("quote-request");
}

describe("QuoteRequestPage (mock \"Quote on the Order\")", () => {
  beforeEach(() => { vi.resetModules(); cancelQuoteRequestAction.mockReset(); orderNowAtSheetPriceAction.mockReset(); refresh.mockReset(); });

  it("shows where the order is, what happens next, how to change it and the kits asked for", async () => {
    const p = await page();
    const t = p.textContent ?? "";
    expect(t).toContain("Order AP-1063 · Volume quote");
    expect(t).toContain("Thanks, Dana. We're pricing your kits now. Within 12 business hours (by 11:39 pm MT) we'll email d@lab.org");
    expect(t).toContain("We price your kits within 12 business hours");
    expect([...p.querySelectorAll(".s-qr-track li")].map((l) => l.textContent)).toEqual(["RequestedOct 17", "PricingBy 11:39 pm MT", "DepositBy Oct 19", "ShipsAbout Nov 10"]);
    expect(t).toContain("pay the 40% deposit straight from your bank account or by card. Paying the deposit is how you accept the quote.");
    expect(t).toContain("the run closing Oct 19; after that, the next one closes Nov 2.");
    expect(t).toContain("orders@auraprotocols.com");
    expect(t).toContain("Sent from the order sheet · Q-1009");
    expect(screen.getByTestId("quote-request-count").textContent).toBe("40 kits · 400 vials");
    expect(t).toContain("Coming by 11:39 pm MT");
    expect(t).toContain("40% off for 20+ kits");
  });

  it("bank only with an incretin or amylin analog; says when pricing runs late", async () => {
    const p = await page({ cardAllowed: false, late: true });
    expect(p.textContent).toContain("pay the 40% deposit straight from your bank account. ");
    expect(p.textContent).toContain("Running late");
    expect(p.textContent).toContain("Coming soon");
  });

  it("Order now goes to the order sheet with the same kits", async () => {
    orderNowAtSheetPriceAction.mockResolvedValue({ ok: true, url: "/wholesale?step=order&kits=x" });
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    await page();
    fireEvent.click(screen.getByRole("button", { name: /^Order now at the listed price/ }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/wholesale?step=order&kits=x"));
    expect(orderNowAtSheetPriceAction).toHaveBeenCalledWith("AP-1063");
    vi.unstubAllGlobals();
  });

  it("Cancel asks once in the page, then cancels; an error is shown, not swallowed", async () => {
    cancelQuoteRequestAction.mockResolvedValueOnce({ error: "We've just priced this order — reload the page to see your price." }).mockResolvedValueOnce({ ok: true });
    await page();
    fireEvent.click(screen.getByRole("button", { name: "Cancel this request" }));
    expect(screen.getByText(/Cancel AP-1063\? We won't price it/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Yes, cancel the request" }));
    expect((await screen.findByRole("alert")).textContent).toContain("We've just priced this order");
    fireEvent.click(screen.getByRole("button", { name: "Yes, cancel the request" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });
});
