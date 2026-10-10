import { describe, it, expect } from "vitest";
import { CHEMICAL_CLASSES } from "@/data/catalog";
import { CLASS_COLOR, classShortName } from "@/lib/class-colors";

// WCAG relative luminance, for the "readable on paper" guard below.
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

describe("class colours", () => {
  it("gives every chemical class its own colour", () => {
    const colours = CHEMICAL_CLASSES.map((c) => CLASS_COLOR[c]);
    expect(colours.every(Boolean)).toBe(true);
    expect(new Set(colours).size).toBe(CHEMICAL_CLASSES.length);
  });

  it("keeps every class colour readable as text on paper (4.5:1)", () => {
    for (const c of CHEMICAL_CLASSES) expect(contrast(CLASS_COLOR[c], "#EDE9E0")).toBeGreaterThanOrEqual(4.5);
  });

  it("shortens class names for the monograph placard", () => {
    expect(classShortName("Mitochondrial & Metabolic")).toBe("Mitochondrial");
    expect(classShortName("Short Peptides & Neuropeptides")).toBe("Neuropeptides");
    expect(classShortName("Blends")).toBe("Blends");
  });
});
