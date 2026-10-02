import { describe, it, expect } from "vitest";
import { compounds } from "@/data/catalog";
import { findViolations } from "../../scripts/compliance-scan.mjs";

describe("product descriptions", () => {
  it("every listed product has a 1–3 sentence description and an https source", () => {
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
