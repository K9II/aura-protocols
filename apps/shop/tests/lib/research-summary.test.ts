import { describe, it, expect } from "vitest";
import { catalogContent } from "@/data/catalog";
import { guideFor, researchSummary } from "@/lib/research-summary";
import { findViolations } from "../../scripts/compliance-scan.mjs";

describe("product research summary", () => {
  it("every product has a research guide with a Where Research Is Heading list", () => {
    for (const c of catalogContent) {
      expect(guideFor(c.slug), c.slug).toBeDefined();
      expect(researchSummary(c.slug)?.heading.length, c.slug).toBeGreaterThan(0);
    }
  });

  it("extracts excerpt, highlights, references and the guide link", () => {
    const s = researchSummary("mots-c")!;
    expect(s.title).toBe("MOTS-c: A Research Literature Summary");
    expect(s.highlights[0]).toMatch(/^Folate-cycle/);
    expect(s.heading[0]).toMatch(/^Receptor: identifying how MOTS-c signals/);
    expect(s.referenceCount).toBe(5);
    expect(s.href).toBe("/blog/mots-c-research-guide");
    expect(s.readTime).toBe("5 min");
  });

  it("blends link their blend summary (no highlights list there)", () => {
    const s = researchSummary("bpc-157-tb-500-ghk-cu")!;
    expect(s.href).toBe("/blog/glow-blend-research-guide");
    expect(s.highlights).toEqual([]);
  });

  it("nothing shown on a product page trips the compliance scanner", () => {
    for (const c of catalogContent) {
      const s = researchSummary(c.slug)!;
      for (const t of [s.title, s.excerpt, ...s.highlights, ...s.heading, s.disclaimer]) expect(findViolations(t), `${c.slug}: ${t}`).toEqual([]);
    }
  });
});
