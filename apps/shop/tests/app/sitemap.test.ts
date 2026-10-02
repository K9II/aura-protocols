import { describe, it, expect } from "vitest";
import sitemap from "@/app/sitemap";
import { compounds } from "@/data/catalog";

const paths = () => sitemap().map((e) => new URL(e.url).pathname);

describe("sitemap", () => {
  it("lists the storefront pages", () => {
    for (const p of ["/", "/products", "/coa", "/wholesale", "/affiliates", "/partner-agreement", "/about", "/quality-standards", "/terms", "/privacy", "/shipping", "/refund-policy", "/ruo"]) {
      expect(paths()).toContain(p);
    }
  });

  it("lists every compound", () => {
    for (const c of compounds) expect(paths()).toContain(`/products/${c.slug}`);
  });

  it("omits removed, gated and private routes", () => {
    for (const p of ["/calculator", "/playbook", "/cart", "/blog", "/telehealth/disclosures"]) expect(paths()).not.toContain(p);
    expect(paths().every((p) => !p.startsWith("/validate") && !p.startsWith("/blog/"))).toBe(true);
  });
});
