import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import KitCards from "@/components/store/wholesale/KitCards";
import type { KitSheetRow } from "@/lib/wholesale/rules";

const row = (slug: string, name: string, cls: string, designation: string | null = null): KitSheetRow => ({
  slug, name, designation, chemicalClass: cls, variantId: "10mg", strength: "10 mg", priceUsd: 79, art: { cap: "red", vialLabel: name },
});
const ROWS = [row("bpc-157", "BPC-157", "Peptide Fragments"), row("retatrutide", "Retatrutide", "Incretin & Amylin Analogs", "APro-G3RT"), row("kpv", "KPV", "Peptide Fragments")];
const TIERS = [{ minKits: 5, pct: 20 }, { minKits: 10, pct: 25 }, { minKits: 20, pct: 30 }];

describe("KitCards (wholesale option C)", () => {
  it("shows every strength as a kit card with its volume price range and no kit price", () => {
    const { container } = render(<KitCards rows={ROWS} tiers={TIERS} />);
    expect(container.querySelectorAll(".s-kc-card")).toHaveLength(3);
    expect(screen.getByText("APro-G3RT (Retatrutide)")).toBeTruthy();
    expect(screen.getAllByText("20–30% off")).toHaveLength(3);
    expect(container.textContent).not.toMatch(/\$/);
  });

  it("class pills filter the cards; All brings them back", () => {
    const { container } = render(<KitCards rows={ROWS} tiers={TIERS} />);
    fireEvent.click(screen.getByRole("button", { name: "Peptide Fragments" }));
    expect(container.querySelectorAll(".s-kc-card")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Peptide Fragments" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "All 3" }));
    expect(container.querySelectorAll(".s-kc-card")).toHaveLength(3);
  });
});
