import { describe, it, expect } from "vitest";
import { catalogContent } from "@/data/catalog";

// Products shown at launch. The six incretin & amylin analogs are hidden in
// Aura Store pending processor approval and have no descriptions yet.
const compounds = catalogContent.filter((c) => c.chemicalClass !== "Incretin & Amylin Analogs");
import { findViolations } from "../../scripts/compliance-scan.mjs";

describe("product descriptions", () => {
  it("every product shown at launch has a 1–3 sentence description and an https source", () => {
    for (const c of compounds) {
      expect(c.description, c.slug).toBeTruthy();
      const sentences = c.description!.split(/(?<=\.)\s+/).length;
      expect(sentences, c.slug).toBeGreaterThanOrEqual(1);
      expect(sentences, c.slug).toBeLessThanOrEqual(3);
      expect(c.descriptionSource, c.slug).toMatch(/^https:\/\//);
    }
  });

  it("no description trips the compliance scanner", () => {
    for (const c of compounds) expect(findViolations(c.description ?? ""), c.slug).toEqual([]);
  });

  it("blends name every component by its catalog name", () => {
    for (const c of compounds.filter((x) => x.components && x.components.length)) {
      for (const slug of c.components!) {
        const name = compounds.find((x) => x.slug === slug)!.name.replace(/\s*\(.*\)$/, "");
        expect(c.description, `${c.slug} → ${slug}`).toContain(name);
      }
    }
  });
});
