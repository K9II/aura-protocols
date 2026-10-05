import { describe, it, expect, vi, beforeEach } from "vitest";
import { liveFixture } from "../helpers/live-catalog";

const { live } = vi.hoisted(() => ({ live: vi.fn() }));
vi.mock("@/lib/catalog-live", () => ({ getLiveCatalog: live }));
import sitemap from "@/app/sitemap";

const shown = () => liveFixture().filter((c) => c.chemicalClass !== "Incretin & Amylin Analogs");
const paths = async () => (await sitemap()).map((e) => new URL(e.url).pathname);

describe("sitemap", () => {
  beforeEach(() => { live.mockReset(); live.mockResolvedValue({ all: liveFixture(), shown: shown(), lots: [] }); });

  it("lists the storefront pages", async () => {
    const p = await paths();
    for (const x of ["/", "/products", "/coa", "/wholesale", "/affiliates", "/partner-agreement", "/about", "/quality-standards", "/terms", "/privacy", "/shipping", "/refund-policy", "/ruo"]) {
      expect(p).toContain(x);
    }
  });

  it("lists every shown compound and no hidden one", async () => {
    const p = await paths();
    for (const c of shown()) expect(p).toContain(`/products/${c.slug}`);
    expect(p).not.toContain("/products/semaglutide");
  });

  it("fails rather than listing products when the live catalog can't be read", async () => {
    live.mockRejectedValue(new Error("down"));
    await expect(sitemap()).rejects.toThrow("down");
  });

  it("omits removed, gated and private routes", async () => {
    const p = await paths();
    for (const x of ["/calculator", "/playbook", "/cart", "/blog", "/telehealth/disclosures"]) expect(p).not.toContain(x);
    expect(p.every((x) => !x.startsWith("/validate") && !x.startsWith("/blog/"))).toBe(true);
  });
});
