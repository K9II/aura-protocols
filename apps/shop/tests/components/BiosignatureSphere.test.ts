import { describe, it, expect } from "vitest";
import { SPHERE_SLUGS, sphereNodes, spherePairs } from "@/lib/sphere-nodes";
import { liveFixture } from "../helpers/live-catalog";

// The live shown catalog (the seed hides the incretin & amylin analogs).
const compounds = liveFixture().filter((c) => c.chemicalClass !== "Incretin & Amylin Analogs");
import { findViolations } from "../../scripts/compliance-scan.mjs";

describe("BiosignatureSphere nodes", () => {
  it("shows every chosen slug: each is a listed compound (swap in a listed one if this fails)", () => {
    expect(sphereNodes(compounds).map((n) => n.key)).toEqual([...SPHERE_SLUGS]);
  });

  it("labels and links every node from the listed catalog", () => {
    for (const n of sphereNodes(compounds)) {
      const c = compounds.find((x) => x.slug === n.key)!;
      expect(n.name, n.key).toBe(c.name);
      expect(n.cls, n.key).toBe(c.chemicalClass);
      expect(n.href, n.key).toBe(`/products/${c.slug}`);
    }
  });

  it("drops a compound that is no longer listed, and any pair that used it", () => {
    const list = compounds.filter((c) => c.slug !== "mots-c");
    const nodes = sphereNodes(list);
    expect(nodes.map((n) => n.key)).not.toContain("mots-c");
    expect(spherePairs(nodes).some((p) => p.a === "mots-c" || p.b === "mots-c")).toBe(false);
  });

  it("only pairs compounds of the same chemical class, captioned with that class", () => {
    const nodes = sphereNodes(compounds);
    const pairs = spherePairs(nodes);
    expect(pairs.length).toBeGreaterThan(0);
    for (const p of pairs) {
      const a = nodes.find((n) => n.key === p.a)!;
      const b = nodes.find((n) => n.key === p.b)!;
      expect(a.cls, p.text).toBe(b.cls);
      expect(p.text).toContain(a.cls);
      expect(findViolations(p.text)).toEqual([]);
    }
  });

  it("carries no biometric readings", () => {
    const nodes = sphereNodes(compounds);
    const text = JSON.stringify({ nodes, pairs: spherePairs(nodes) });
    expect(text).not.toMatch(/glucose|body fat|recovery|sleep|hrv|vo2|strain|spo2|biometric/i);
  });
});
