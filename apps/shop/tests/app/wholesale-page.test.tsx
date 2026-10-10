import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const m = vi.hoisted(() => ({ getWholesaleSettings: vi.fn(), getAccountState: vi.fn(), getLiveCatalogOrNull: vi.fn(), sheetProps: vi.fn() }));
vi.mock("@/lib/wholesale/data", () => ({ getWholesaleSettings: m.getWholesaleSettings }));
vi.mock("@/lib/dal", () => ({ getAccountState: m.getAccountState }));
vi.mock("@/lib/catalog-live", () => ({ getLiveCatalogOrNull: m.getLiveCatalogOrNull }));
vi.mock("@/lib/clock", () => ({ currentMs: () => Date.parse("2026-10-09T18:00:00Z") }));
vi.mock("@/components/store/InquiryForm", () => ({ default: () => <div>inquiry form</div> }));
vi.mock("@/components/store/wholesale/WholesaleOrderSheet", () => ({ default: (p: unknown) => { m.sheetProps(p); return <div>order sheet</div>; } }));
vi.mock("@/components/store/wholesale/WholesaleTurnOn", () => ({ default: () => <div>turn on</div> }));

const open = { open: true, tiers: [{ minKits: 5, pct: 20 }, { minKits: 10, pct: 25 }, { minKits: 20, pct: 30 }], depositPct: 40, balanceDays: 7,
  runDays: 14, leadDays: 28, nextCutoffOverride: null, minKits: 5 };
const live = { shown: [
  { slug: "bpc-157", name: "BPC-157", chemicalClass: "Peptide Fragments", variants: [{ id: "10mg", strength: "10 mg", priceUsd: 79, wholesale: true }] },
  { slug: "retatrutide", name: "Retatrutide", designation: "APro-G3RT", chemicalClass: "Incretin & Amylin Analogs", variants: [{ id: "10mg", strength: "10 mg", priceUsd: 125, wholesale: true }] },
  { slug: "kpv", name: "KPV", chemicalClass: "Peptide Fragments", variants: [{ id: "10mg", strength: "10 mg", priceUsd: 55, wholesale: false }] },
] };
const enabled = { id: "c1", email: "j@lab.org", research: { field: "independent" }, organization: null, ship: null, wholesale: { enabledAt: "x", disabledAt: null } };

async function page(step?: string) {
  const { default: Page } = await import("@/app/wholesale/page");
  return render(await Page({ searchParams: Promise.resolve(step ? { step } : {}) }));
}

describe("/wholesale", () => {
  beforeEach(() => { vi.resetModules(); m.getLiveCatalogOrNull.mockResolvedValue(live); m.sheetProps.mockReset(); });

  it("closed, or settings unreadable: today's inquiry page with the new headline", async () => {
    m.getWholesaleSettings.mockResolvedValue({ ...open, open: false });
    const { container } = await page();
    expect(container.textContent).toMatch(/For heavier research\./);
    expect(screen.getByText("inquiry form")).toBeTruthy();
    expect(screen.queryByText("order sheet")).toBeNull();
    m.getWholesaleSettings.mockRejectedValue(new Error("down"));
    const again = await page();
    expect(again.container.textContent).toMatch(/For heavier research\./);
  });

  it("open, signed out: tiers, minimum, testing promise, featured kits without prices, sign in", async () => {
    m.getWholesaleSettings.mockResolvedValue(open);
    m.getAccountState.mockResolvedValue({ customer: null, blocked: false, unfinished: false });
    const { container } = await page();
    const text = container.textContent ?? "";
    expect(text).toMatch(/Research kits\./);
    expect(screen.getByRole("note", { name: "Minimum 5 kits per order" }).textContent).toMatch(/^5Minimum orderKits \(50 vials\)/);
    expect(text).toMatch(/Every batch is independently tested/);
    expect(text).toMatch(/Offered as kits · 2 strengths/);
    // option C kit cards: name with scientific name, kit size, volume pricing — never a kit price
    expect(text).toMatch(/APro-G3RT \(Retatrutide\)Kit10 mg × 10 vials/);
    expect(text).toMatch(/Volume price20–30% off/);
    expect(text).not.toMatch(/KPV/);
    expect(text).not.toMatch(/\$(79|125|55)|\$\d+\.\d\d/);
    expect(text).toMatch(/Today · 10 days to order/);
    expect(screen.getByRole("link", { name: /sign in to order/i }).getAttribute("href")).toBe("/sign-in?next=%2Fwholesale%3Fstep%3Dorder");
    expect(screen.getByText("Order by")).toBeTruthy();
  });

  it("open, signed in: the intro first, with Start an order", async () => {
    m.getWholesaleSettings.mockResolvedValue(open);
    m.getAccountState.mockResolvedValue({ customer: enabled });
    const { container } = await page();
    expect(container.textContent).toMatch(/Offered as kits/);
    expect(screen.queryByText("order sheet")).toBeNull();
    expect(screen.getByRole("link", { name: /start an order/i }).getAttribute("href")).toBe("/wholesale?step=order");
    expect(screen.queryByRole("link", { name: /sign in to order/i })).toBeNull();
  });

  it("open, signed out on the order step: still the intro with sign in", async () => {
    m.getWholesaleSettings.mockResolvedValue(open);
    m.getAccountState.mockResolvedValue({ customer: null, blocked: false, unfinished: false });
    await page("order");
    expect(screen.queryByText("order sheet")).toBeNull();
    expect(screen.getByRole("link", { name: /sign in to order/i })).toBeTruthy();
  });

  it("order step, signed in: turn on until enabled, then the order sheet with the pricing settings and kit art", async () => {
    m.getWholesaleSettings.mockResolvedValue(open);
    m.getAccountState.mockResolvedValue({ customer: { ...enabled, research: null, wholesale: { enabledAt: null, disabledAt: null } } });
    await page("order");
    expect(screen.getByText("turn on")).toBeTruthy();
    m.getAccountState.mockResolvedValue({ customer: enabled });
    await page("order");
    expect(screen.getByText("order sheet")).toBeTruthy();
    const props = m.sheetProps.mock.calls[0][0] as { rows: Array<{ slug: string; art: { cap: string; vialLabel: string } }>; pricing: unknown; cutoffLabel: string };
    expect(props.pricing).toEqual({ tiers: open.tiers, depositPct: 40, minKits: 5 });
    expect(props.cutoffLabel).toBe("Oct 19");
    expect(props.rows.find((r) => r.slug === "retatrutide")?.art.vialLabel).toBe("APro-G3RT");
  });

  it("owner switched wholesale off for the customer: no sheet, inquiry stays", async () => {
    m.getWholesaleSettings.mockResolvedValue(open);
    m.getAccountState.mockResolvedValue({ customer: { ...enabled, wholesale: { enabledAt: "x", disabledAt: "y" } } });
    await page("order");
    expect(screen.getByText(/switched off for your account/)).toBeTruthy();
    expect(screen.queryByText("order sheet")).toBeNull();
  });
});
