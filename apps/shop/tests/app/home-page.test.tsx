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
// The lineup is on the page twice (phones: inside the hero; desktop: after the 1906 plate); CSS shows one.
const lineupIn = (where: "desk" | "phone") => document.querySelector<HTMLElement>(`.s-lineup--${where}`)!;
const deskLineupHeading = () => within(lineupIn("desk")).getByRole("heading", { level: 2, name: /the lineup/i });

describe("/ (home)", () => {
  beforeEach(() => { live.mockReset(); live.mockResolvedValue({ all: liveFixture(), shown: liveFixture(), lots: [] }); });

  it("leads with the 1906 receipt headline and the independent third-party US lab line", async () => {
    await renderHome();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("1906 gave us the test.We added the receipt.");
    expect(screen.getByText(/separated and measured by an independent third-party US lab before it goes out for research/i)).toBeInTheDocument();
    expect(screen.getByText(/published under the lot number on your vial/i)).toBeInTheDocument();
  });

  it("links the lineup heading to the full inventory", async () => {
    await renderHome();
    const heading = deskLineupHeading();
    const link = heading.querySelector("a");
    expect(link).not.toBeNull();
    expect(link!.getAttribute("href")).toBe("/products");
  });

  it("shows Tsvet's 1906 plate before the lineup, credited, with an HPLC trace linking to the real certificates", async () => {
    await renderHome();
    const record = screen.getByRole("region", { name: /purity has a method/i });
    expect(within(record).getByRole("img", { name: /tsvet.*1906/i })).toBeInTheDocument();
    expect(within(record).getByRole("img", { name: /hplc chromatogram/i })).toBeInTheDocument();
    expect(record).toHaveTextContent(/Berichte der Deutschen Botanischen Gesellschaft 24 \(1906\)/);
    expect(record).toHaveTextContent(/public domain/i);
    expect(within(record).getByRole("link", { name: /certificate/i })).toHaveAttribute("href", "/coa");
    // Comes before the (desktop) lineup.
    const lineup = deskLineupHeading();
    expect(record.compareDocumentPosition(lineup) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("fails closed when the live catalog can't be read", async () => {
    live.mockResolvedValue(null);
    await renderHome();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Unavailable right now");
  });

  it("counts and features from the live shown catalog", async () => {
    const shown = liveFixture().filter((c) => c.chemicalClass !== "Incretin & Amylin Analogs");
    live.mockResolvedValue({ all: liveFixture(), shown, lots: [] });
    await renderHome();
    for (const where of ["desk", "phone"] as const) {
      expect(within(lineupIn(where)).getByText(`See all ${shown.length} compounds →`)).toBeInTheDocument();
      expect(within(lineupIn(where)).getAllByRole("heading", { level: 3 })).toHaveLength(shown.filter((c) => c.featured).length);
    }
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
