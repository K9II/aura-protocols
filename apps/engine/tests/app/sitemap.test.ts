import { describe, it, expect } from "vitest";
import sitemap from "@/app/sitemap";

describe("sitemap", () => {
  it("includes the public Engine pages", () => {
    const urls = sitemap().map((e) => new URL(e.url).pathname);
    expect(urls).toContain("/");
    expect(urls).toContain("/connect");
    expect(urls).toContain("/upload");
  });

  it("excludes API + auth callback routes", () => {
    const urls = sitemap().map((e) => new URL(e.url).pathname);
    expect(urls.every((p) => !p.startsWith("/api"))).toBe(true);
    expect(urls.every((p) => !p.startsWith("/auth"))).toBe(true);
  });
});
