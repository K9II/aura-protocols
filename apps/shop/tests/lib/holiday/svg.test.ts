import { describe, it, expect } from "vitest";
import { garlandDefsSvg, garlandStripSvg, hollySvg, GARLAND_THICKNESS, HOLLY_BOX, HOLLY_REACH } from "@/lib/holiday/garland";

const ids = (svg: string) => [...svg.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);

describe("holiday garland SVG (size-independent)", () => {
  it("is deterministic", () => {
    expect(garlandDefsSvg()).toBe(garlandDefsSvg());
    expect(garlandStripSvg("h")).toBe(garlandStripSvg("h"));
    expect(hollySvg(0)).toBe(hollySvg(0));
  });

  it("defines needle and light patterns once; strips only paint them at 100% of their box (no measured size)", () => {
    const defs = garlandDefsSvg();
    for (const id of ["s-offer-needles-h", "s-offer-needles-v", "s-offer-needles2-h", "s-offer-needles2-v", "s-offer-lights0-h", "s-offer-lights1-v"]) expect(ids(defs)).toContain(id);
    for (const id of ids(defs)) expect(id).toMatch(/^s-offer-/);
    expect(defs).toContain('patternUnits="userSpaceOnUse"');
    for (const dir of ["h", "v"] as const) {
      const strip = garlandStripSvg(dir);
      expect(strip).toContain('width="100%"');
      expect(strip).toContain('height="100%"');
      expect(strip).toContain(`url(#s-offer-needles-${dir})`);
      expect(strip).toContain(`url(#s-offer-lights0-${dir})`);
      expect(strip).not.toMatch(/viewBox/); // a viewBox would scale the needles with the panel
      expect(ids(strip)).toEqual([]);       // no duplicate ids across the four strips
    }
    expect(GARLAND_THICKNESS).toBeGreaterThanOrEqual(28);
    expect(GARLAND_THICKNESS).toBeLessThanOrEqual(40);
  });

  it("holly corners are fixed-size, with berries, and reach at most HOLLY_REACH outside the corner", () => {
    for (const corner of [0, 1, 2, 3] as const) {
      const s = hollySvg(corner);
      expect(s).toContain(`width="${HOLLY_BOX}"`);
      expect(s).toContain("url(#s-offer-berry)");
      expect(s).not.toMatch(/NaN|undefined/);
    }
    expect(HOLLY_REACH).toBeLessThan(HOLLY_BOX / 2);
  });

  it("never uses a compliance-flagged word in classes or ids", () => {
    expect(garlandDefsSvg() + garlandStripSvg("h") + hollySvg(2)).not.toMatch(/stack/i);
  });
});
