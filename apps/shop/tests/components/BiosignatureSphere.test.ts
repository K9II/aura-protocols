import { describe, it, expect } from "vitest";
import { NODES, PAIRS } from "@/components/BiosignatureSphere";
import { compounds } from "@/data/catalog";
import { findViolations } from "../../scripts/compliance-scan.mjs";

describe("BiosignatureSphere nodes", () => {
  it("labels every node with a listed compound's name and chemical class", () => {
    for (const n of NODES) {
      const c = compounds.find((x) => x.slug === n.key);
      expect(c, n.key).toBeDefined();
      expect(n.name, n.key).toBe(c!.name);
      expect(n.cls, n.key).toBe(c!.chemicalClass);
    }
  });

  it("only pairs compounds of the same chemical class, captioned with that class", () => {
    for (const p of PAIRS) {
      const a = NODES.find((n) => n.key === p.a)!;
      const b = NODES.find((n) => n.key === p.b)!;
      expect(a.cls, p.text).toBe(b.cls);
      expect(p.text).toContain(a.cls);
      expect(findViolations(p.text)).toEqual([]);
    }
  });

  it("carries no biometric readings", () => {
    const text = JSON.stringify({ NODES, PAIRS });
    expect(text).not.toMatch(/glucose|body fat|recovery|sleep|hrv|vo2|strain|spo2|biometric/i);
  });
});
