import { describe, it, expect } from "vitest";
import { visibleText, findViolations } from "../../scripts/compliance-scan.mjs";

describe("compliance scan", () => {
  it("strips scripts, styles and tags, keeping visible text", () => {
    expect(visibleText('<p>Hi <b>there</b></p><script>var dose=1</script><style>.x{}</style>')).toBe("Hi there");
  });

  it("flags dosing, protocol, stack, benefit and outcome language", () => {
    const v = findViolations("Recommended dose. A protocol for weight loss. The Wolverine Stack benefits.");
    expect(v.map((x: { rule: string }) => x.rule)).toEqual(expect.arrayContaining(["dose", "protocol", "stack", "weight loss", "benefit"]));
  });

  it("does not flag the brand name or the legal disclaimer", () => {
    expect(findViolations("Aura Protocols. Not intended to diagnose, treat, cure, or prevent any disease.")).toEqual([]);
  });

  it("does not flag ordinary storefront copy", () => {
    expect(findViolations("Lab-tested research compounds with a certificate tied to the exact lot in your vial.")).toEqual([]);
  });
});
