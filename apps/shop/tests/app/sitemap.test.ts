import { describe, it, expect } from "vitest";
import sitemap from "@/app/sitemap";

describe("sitemap", () => {
  it("includes /playbook", () => {
    const urls = sitemap().map((e) => new URL(e.url).pathname);
    expect(urls).toContain("/playbook");
  });

  it("excludes every /validate route", () => {
    const urls = sitemap().map((e) => new URL(e.url).pathname);
    expect(urls.every((p) => !p.startsWith("/validate"))).toBe(true);
  });
});
