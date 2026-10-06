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

describe("OfferPanel (Ink welcome offer)", () => {
  beforeEach(() => { now.ms = OUT; });

  it("states the offer from the constants: big percent, days, proof strip", async () => {
    const { container } = await panel();
    const aside = screen.getByRole("complementary", { name: "Welcome offer" });
    expect(aside).toHaveClass("s-offer");
    expect(container.textContent).toContain("Welcome offer · new accounts");
    expect(container.querySelector(".s-offer-num")!.textContent).toBe(String(NEW_ACCOUNT_PCT));
    expect(container.querySelector(".s-offer-pct")!.textContent).toBe("%");
    expect(container.textContent).toContain(`off your first order, placed within ${OFFER_DAYS_TEXT}.`);
    expect(container.querySelector(".s-offer-lead em")!.textContent).toBe(`${OFFER_DAYS_TEXT}.`);
    expect(container.textContent).toContain(`≥${PURITY_FLOOR_PCT}%HPLC floor`);
    expect(container.textContent).toContain("1 : 1vial to certificate");
    expect(container.textContent).toContain(`$${FREE_SHIPPING_THRESHOLD_USD}free shipping`);
    expect(findViolations(visibleText(container.innerHTML))).toEqual([]);
    expect(container.innerHTML).not.toMatch(/no code needed|stack/i);
  });

  it("out of season: the same panel, no tree, snow or garland", async () => {
    const { container } = await panel();
    expect(container.querySelector(".s-offer")).not.toHaveClass("s-offer--holiday");
    expect(container.querySelector(".s-offer-tree")).toBeNull();
    expect(container.querySelector(".s-offer-snow")).toBeNull();
    expect(container.querySelector(".s-offer-garland")).toBeNull();
  });

  it("in season (shop time Dec 1 – Jan 1): tree, snowfall and garland with four strips and four holly corners", async () => {
    now.ms = IN;
    const { container } = await panel();
    expect(container.querySelector(".s-offer")).toHaveClass("s-offer--holiday");
    expect(container.querySelector(".s-offer-tree svg")).not.toBeNull();
    expect(container.querySelectorAll(".s-offer-snow i").length).toBeGreaterThan(20);
    const g = container.querySelector(".s-offer-garland")!;
    expect(g).toHaveAttribute("aria-hidden", "true");
    expect(g.querySelectorAll(".s-offer-strip")).toHaveLength(4);
    expect(g.querySelectorAll(".s-offer-holly")).toHaveLength(4);
    // decoration is hidden from assistive tech; the offer text is not
    for (const el of container.querySelectorAll(".s-offer-tree, .s-offer-snow")) expect(el).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("complementary", { name: "Welcome offer" })).toBeInTheDocument();
  });

  it("only the snow layer clips: the panel that holds the garland has no overflow rule, and motion stops on request", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const rule = (sel: string) => new RegExp(`${sel.replace(/[.-]/g, (c) => `\\${c}`)}\\s*\\{[^}]*\\}`).exec(css)?.[0] ?? "";
    expect(rule(".pharmacopoeia .s-offer")).not.toBe("");
    expect(rule(".pharmacopoeia .s-offer")).not.toMatch(/overflow/);
    expect(rule(".pharmacopoeia .s-offer-garland")).not.toMatch(/overflow:\s*(hidden|clip)/);
    expect(rule(".pharmacopoeia .s-offer-snow")).toMatch(/overflow:\s*hidden/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\.s-offer/);
  });
});
