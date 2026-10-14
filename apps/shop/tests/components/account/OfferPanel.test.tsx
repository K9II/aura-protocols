import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { NEW_ACCOUNT_PCT, OFFER_DAYS_TEXT } from "@/lib/account/offer";
import { PURITY_FLOOR_PCT } from "@/lib/constants";
import { FREE_SHIPPING_THRESHOLD_USD } from "@/lib/cart";
import { findViolations, visibleText } from "../../../scripts/compliance-scan.mjs";

const now = vi.hoisted(() => ({ ms: 0 }));
vi.mock("@/lib/clock", () => ({ currentMs: () => now.ms }));

const OUT = Date.parse("2026-10-06T18:00:00Z");
const IN = Date.parse("2026-12-10T18:00:00Z");

const panel = async () => {
  const { default: OfferPanel } = await import("@/components/account/OfferPanel");
  return render(<OfferPanel />);
};

describe("OfferPanel (welcome-offer placard)", () => {
  beforeEach(() => { now.ms = OUT; });

  it("states the offer from the constants on a placard: big percent, days, the three claims", async () => {
    const { container } = await panel();
    const aside = screen.getByRole("complementary", { name: "Welcome offer" });
    expect(aside).toHaveClass("s-offer");
    const placard = container.querySelector(".s-offer-tile .s-pp-placard")!;
    expect(placard.textContent).toContain("Welcome offer · new accounts");
    expect(placard.querySelector(".s-offer-num")!.textContent).toBe(String(NEW_ACCOUNT_PCT));
    expect(placard.querySelector(".s-offer-pct")!.textContent).toBe("%");
    expect(placard.textContent).toContain(`off your first order, placed within ${OFFER_DAYS_TEXT}.`);
    expect(placard.querySelector(".s-offer-lead em")!.textContent).toBe(`${OFFER_DAYS_TEXT}.`);
    expect(placard.textContent).toContain(`Purity≥${PURITY_FLOOR_PCT}% HPLC floor`);
    expect(placard.textContent).toContain("Record1 : 1 vial to certificate");
    expect(placard.textContent).toContain(`Shippingfree over $${FREE_SHIPPING_THRESHOLD_USD}`);
    expect(placard.textContent).toContain("Research use only · Not for human use");
    expect(findViolations(visibleText(container.innerHTML))).toEqual([]);
    expect(container.innerHTML).not.toMatch(/no code needed|stack/i);
  });

  it("hangs a tag off the tile (decoration: its words repeat the placard) and puts the trust row underneath", async () => {
    const { container } = await panel();
    const tag = container.querySelector(".s-offer-tile .s-pp-tag")!;
    expect(tag).toHaveAttribute("aria-hidden", "true");
    expect(tag.textContent).toBe(`New accountFirst order${NEW_ACCOUNT_PCT}% off`);
    const trust = screen.getByRole("list", { name: "Why researchers order from Aura" });
    expect(trust).toHaveClass("s-trust--offer");
    expect(trust.querySelectorAll("li")).toHaveLength(4);
    expect(container.querySelector(".s-offer-tile")!.compareDocumentPosition(trust) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("out of season: no garland, and the tree and snow are gone for good", async () => {
    const { container } = await panel();
    expect(container.querySelector(".s-offer")).not.toHaveClass("s-offer--holiday");
    expect(container.querySelector(".s-offer-garland")).toBeNull();
    expect(container.querySelector(".s-offer-tree, .s-offer-snow")).toBeNull();
  });

  it("in season (shop time Dec 1 – Jan 1): a garland with four strips and four holly corners frames the tile", async () => {
    now.ms = IN;
    const { container } = await panel();
    expect(container.querySelector(".s-offer")).toHaveClass("s-offer--holiday");
    const g = container.querySelector(".s-offer-tile > .s-offer-garland")!;
    expect(g).toHaveAttribute("aria-hidden", "true");
    expect(g.querySelectorAll(".s-offer-strip")).toHaveLength(4);
    expect(g.querySelectorAll(".s-offer-holly")).toHaveLength(4);
    expect(container.querySelector(".s-offer-tree, .s-offer-snow")).toBeNull();
    expect(screen.getByRole("complementary", { name: "Welcome offer" })).toBeInTheDocument();
  });

  it("nothing that holds the garland clips, and the lights stop twinkling on request", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const rule = (sel: string) => new RegExp(`${sel.replace(/[.-]/g, (c) => `\\${c}`)}\\s*\\{[^}]*\\}`).exec(css)?.[0] ?? "";
    for (const sel of [".pharmacopoeia .s-offer", ".pharmacopoeia .s-pp-tile.s-offer-tile", ".pharmacopoeia .s-pp-tile", ".pharmacopoeia .s-offer-garland"]) {
      expect(rule(sel)).not.toBe("");
      expect(rule(sel)).not.toMatch(/overflow/);
    }
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\.s-offer-lights[^}]*animation: none/);
  });
});
