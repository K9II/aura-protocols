import { describe, it, expect } from "vitest";
import { treeSvg } from "@/lib/holiday/tree";
import { garlandDefsSvg, garlandStripSvg, hollySvg, GARLAND_THICKNESS, HOLLY_BOX, HOLLY_REACH } from "@/lib/holiday/garland";

const ids = (svg: string) => [...svg.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);

describe("holiday tree SVG", () => {
  it("is deterministic (same string every render, so no hydration drift)", () => {
    expect(treeSvg()).toBe(treeSvg());
    expect(treeSvg({ seed: 3 })).not.toBe(treeSvg({ seed: 4 }));
  });

  it("keeps the mock's realistic parts: needles, snow tips, glowing lights, baubles, star, snowbank", () => {
    const s = treeSvg();
    expect(s.startsWith("<svg")).toBe(true);
    expect(s).toContain('viewBox="0 0 260 300"');
    expect((s.match(/stroke-linecap="round"/g) ?? []).length).toBeGreaterThan(100); // needle strokes
    expect((s.match(/fill="#F4F8FB"/g) ?? []).length).toBeGreaterThan(30);          // snow on bough tips
    expect((s.match(/class="s-offer-glow"/g) ?? []).length).toBeGreaterThan(30);    // twinkling lights
    expect(s).toContain("url(#s-offer-bulbR)");
    expect(s).toContain("url(#s-offer-bulbG)");
    expect(s).toContain('class="s-offer-starglow"');
    expect(s).toContain("url(#s-offer-snowbank)");
    expect(s).toContain('aria-hidden="true"');
    expect(s).not.toMatch(/NaN|undefined/);
  });

  it("namespaces every id so it can't collide with other SVGs on the page", () => {
    expect(ids(treeSvg()).length).toBeGreaterThan(0);
    for (const id of ids(treeSvg())) expect(id).toMatch(/^s-offer-/);
  });
});

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
    expect(treeSvg() + garlandDefsSvg() + garlandStripSvg("h") + hollySvg(2)).not.toMatch(/stack/i);
  });
});
