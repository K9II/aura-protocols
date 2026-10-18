import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";

// Animations; jsdom has no canvas or matchMedia.
vi.mock("@/components/BiosignatureSphere", () => ({ default: () => null }));
vi.mock("@/components/ScrollReveal", () => ({ default: () => null }));
const { live } = vi.hoisted(() => ({ live: vi.fn() }));
vi.mock("@/lib/catalog-live", () => ({ getLiveCatalogOrNull: live }));
vi.mock("@/app/letter-actions", () => ({ letterStatusAction: () => new Promise(() => {}), subscribeLetterAction: vi.fn() }));

import HomePage from "@/app/page";
import { liveFixture } from "../helpers/live-catalog";

const renderHome = async () => render(await HomePage());
// The lineup is on the page twice (phones: inside the hero; desktop: further down); CSS shows one.
const lineupIn = (where: "desk" | "phone") => document.querySelector<HTMLElement>(`.s-lineup--${where}`)!;
const deskLineupHeading = () => within(lineupIn("desk")).getByRole("heading", { level: 2, name: /the lineup/i });

describe("/ (home)", () => {
  beforeEach(() => { live.mockReset(); live.mockResolvedValue({ all: liveFixture(), shown: liveFixture(), lots: [], certificates: [] }); });

  it("leads with the au·ra dictionary entry and the proof headline; no paragraph, no 7-test panel", async () => {
    await renderHome();
    expect(screen.getByText("the distinct quality that surrounds something.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^Our compounds come surrounded by\sproof\.$/);
    expect(screen.queryByRole("group", { name: /seven tests every lot passes/i })).not.toBeInTheDocument();
    expect(document.querySelector(".s-hero .s-sub")).toBeNull();
    // no lot released yet: no lot card, and the old lot chart is gone
    expect(document.querySelector(".s-proof")).toBeNull();
    expect(document.querySelector(".s-rec--home")).toBeNull();
  });

  it("under the headline: the newest live lot's vial and its own certificate results, linking its certificate", async () => {
    const lots = [
      { slug: "mots-c", compoundName: "MOTS-c", variantId: "10mg", strength: "10 mg", lot: "MOT-2611-02", purityPct: 99.5, method: "HPLC+MS", testedOn: "2026-11-08", coaFile: "/c.pdf", status: "live", liveAt: "2026-11-09T10:00:00Z", onStore: true },
      { slug: "bpc-157", compoundName: "BPC-157", variantId: "10mg", strength: "10 mg", lot: "BPC-2610-01", purityPct: 99.2, method: "HPLC", testedOn: "2026-10-02", coaFile: "/d.pdf", status: "live", liveAt: "2026-10-03T10:00:00Z", onStore: true },
    ];
    const cert = { lot: "MOT-2611-02", measuredMg: null, tests: { identity: "pass", endotoxin: "pass", sterility: "not_tested", heavy_metals: "not_tested", fentanyl: "not_tested" } };
    live.mockResolvedValue({ all: liveFixture(), shown: liveFixture(), lots, certificates: [cert] });
    await renderHome();
    const card = screen.getByRole("group", { name: /lot MOT-2611-02: the code on its vial/i });
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const rows = within(card).getAllByRole("listitem").map((li) => li.textContent);
    expect(rows).toEqual(["IdentityPass", "PurityPass", "QuantityNot tested", "EndotoxinPass", "SterilityNot tested", "Heavy metalsNot tested", "FentanylNot tested"]);
    expect(card).toHaveTextContent("99.5%");
    expect(within(card).getByRole("link", { name: /open/i })).toHaveAttribute("href", "/coa/MOT-2611-02");
  });

  it("rings the sphere with real lots selling now, and never example lots before the first release", async () => {
    await renderHome();
    const rings = screen.getByRole("img", { name: /ringed by lines of text from each lot/i });
    expect(rings).toHaveTextContent(/COMPOUND · LOT NUMBER · PURITY/);
    expect(document.querySelector(".s-hero-sphere .s-aura-core")).not.toBeNull();

    live.mockResolvedValue({ all: liveFixture(), shown: liveFixture(), certificates: [], lots: [
      { slug: "bpc-157", compoundName: "BPC-157", variantId: "10mg", strength: "10 mg", lot: "BPC-2611-03", purityPct: 99.4, method: "HPLC", testedOn: "2026-11-02", coaFile: "/c.pdf", status: "live", liveAt: "2026-11-03", onStore: true },
      { slug: "mots-c", compoundName: "MOTS-c", variantId: "10mg", strength: "10 mg", lot: "MOT-2601-01", purityPct: 99.1, method: "HPLC", testedOn: "2026-01-02", coaFile: "/d.pdf", status: "sold_out", liveAt: "2026-01-03", onStore: true },
    ] });
    document.body.innerHTML = "";
    await renderHome();
    const ring = screen.getByRole("img", { name: /ringed by lines of text from each lot/i });
    expect(ring).toHaveTextContent(/BPC-157 · LOT BPC-2611-03 · 99\.4%/);
    expect(ring).not.toHaveTextContent(/MOT-2601-01/);
    expect(ring).not.toHaveTextContent(/COMPOUND · LOT NUMBER/);
  });

  it("phones: the lineup leads with the Shop the lineup button instead of its heading", async () => {
    await renderHome();
    const phone = lineupIn("phone");
    expect(within(phone).queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
    expect(within(phone).getByRole("link", { name: "Shop the lineup →" })).toHaveAttribute("href", "/products");
  });

  it("links the lineup heading to the full inventory", async () => {
    await renderHome();
    const heading = deskLineupHeading();
    const link = heading.querySelector("a");
    expect(link).not.toBeNull();
    expect(link!.getAttribute("href")).toBe("/products");
  });

  it("no longer shows Tsvet's 1906 plate band (removed 2026-10-17)", async () => {
    await renderHome();
    expect(screen.queryByRole("region", { name: /purity has a method/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /tsvet/i })).not.toBeInTheDocument();
  });

  it("fails closed when the live catalog can't be read", async () => {
    live.mockResolvedValue(null);
    await renderHome();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Unavailable right now");
  });

  it("counts and features from the live shown catalog", async () => {
    const shown = liveFixture().filter((c) => c.chemicalClass !== "Incretin & Amylin Analogs");
    live.mockResolvedValue({ all: liveFixture(), shown, lots: [], certificates: [] });
    await renderHome();
    for (const where of ["desk", "phone"] as const) {
      expect(within(lineupIn(where)).getByText(`See all ${shown.length} compounds →`)).toBeInTheDocument();
      expect(within(lineupIn(where)).getAllByRole("heading", { level: 3 })).toHaveLength(shown.filter((c) => c.featured).length);
    }
  });

  const cardSlugs = (where: "desk" | "phone") => [...new Set(Array.from(lineupIn(where).querySelectorAll<HTMLAnchorElement>('a[href^="/products/"]'))
    .map((a) => a.getAttribute("href")!.replace("/products/", "")))];

  it("phones show MOTS-c, Wolverine, SS-31 and KLOW in that order; desktop keeps the featured four", async () => {
    await renderHome();
    expect(cardSlugs("phone")).toEqual(["mots-c", "bpc-157-tb-500-blend", "ss-31", "bpc-157-tb-500-ghk-cu-kpv"]);
    expect(cardSlugs("desk")).toEqual(liveFixture().filter((c) => c.featured).map((c) => c.slug));
  });

  it("phones: a hidden pick is skipped and the gap filled from the featured list", async () => {
    const shown = liveFixture().filter((c) => c.slug !== "ss-31");
    live.mockResolvedValue({ all: liveFixture(), shown, lots: [], certificates: [] });
    await renderHome();
    const slugs = cardSlugs("phone");
    expect(slugs.slice(0, 3)).toEqual(["mots-c", "bpc-157-tb-500-blend", "bpc-157-tb-500-ghk-cu-kpv"]);
    expect(slugs).toHaveLength(4);
    expect(shown.find((c) => c.slug === slugs[3])!.featured).toBe(true);
  });

  it("shows how an order runs after the lineup, then the Aura letter; the FAQ moved to /faq", async () => {
    await renderHome();
    const lineup = deskLineupHeading();
    const plate = screen.getByRole("region", { name: /four simple steps, start to finish/i });
    const letter = screen.getByRole("region", { name: /the aura letter/i });
    expect(lineup.compareDocumentPosition(plate) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(plate.compareDocumentPosition(letter) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(plate).toHaveTextContent(/Fig\. 4/);
    for (const w of ["Pick", "Verify", "Secure", "Receive"]) expect(within(plate).getByText(w)).toBeInTheDocument();
    // the heading and steps come before the figures (phones stack them in this order)
    const h = within(plate).getByRole("heading", { level: 2, name: /four simple steps/i });
    expect(h.compareDocumentPosition(within(plate).getByText("Fig. 1.")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByText(/straight/i)).not.toBeInTheDocument();
  });

  it("phones get the lineup inside the hero, after the headline block and before the sphere (mock P1)", async () => {
    await renderHome();
    const phone = lineupIn("phone");
    const hero = document.querySelector(".s-hero")!;
    expect(hero).toContainElement(phone);
    expect(hero.firstElementChild!.compareDocumentPosition(phone) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(phone.compareDocumentPosition(document.querySelector(".s-hero-sphere")!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(hero).not.toContainElement(lineupIn("desk"));
    // the two copies' vial SVGs never share ids (a hidden copy's gradients would blank the visible one)
    const ids = [...document.querySelectorAll(".s-lineup [id]")].map((e) => e.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
