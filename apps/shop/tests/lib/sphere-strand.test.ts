import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseSdf, buildStrand, strandDrawItems, shade } from "@/lib/sphere-strand";
import { ELEMENT_COLORS } from "@/lib/structure";

const SDF = readFileSync(join(__dirname, "..", "..", "public", "structures", "ss-31.sdf"), "utf8");
const flat = (x: number, y: number, z: number) => ({ x, y, z, f: 1 });

describe("SS-31 strand for the homepage sphere", () => {
  it("reads the same model file the product page uses: 46 atoms, 47 bonds, with double bonds", () => {
    const { atoms, bonds } = parseSdf(SDF);
    expect(atoms).toHaveLength(46);
    expect(bonds).toHaveLength(47);
    expect(new Set(atoms.map((a) => a.el))).toEqual(new Set(["C", "N", "O"]));
    expect(bonds.some((b) => b.order === 2)).toBe(true);
  });

  it("centres the molecule and scales its farthest atom to the requested radius", () => {
    const s = buildStrand(SDF, 100);
    const far = Math.max(...s.atoms.map((a) => Math.hypot(a.x, a.y, a.z)));
    const c = s.atoms.reduce((m, a) => ({ x: m.x + a.x, y: m.y + a.y, z: m.z + a.z }), { x: 0, y: 0, z: 0 });
    expect(far).toBeCloseTo(100, 5);
    for (const v of [c.x, c.y, c.z]) expect(Math.abs(v / s.atoms.length)).toBeLessThan(1e-9);
    expect(s.pxPerAngstrom).toBeGreaterThan(0);
  });

  it("draws ball-and-stick like the product page: element colours, split bonds, double bonds as two sticks, back to front", () => {
    const s = buildStrand(SDF, 100);
    const items = strandDrawItems(s, (p) => p, flat);
    const balls = items.filter((i) => i.kind === "ball");
    const sticks = items.filter((i) => i.kind === "stick");
    const doubles = s.bonds.filter((b) => b.order === 2).length;
    expect(balls).toHaveLength(46);
    expect(sticks).toHaveLength(2 * (47 - doubles) + 4 * doubles); // each bond has two halves; a double bond doubles them
    expect(new Set(balls.map((b) => b.color))).toEqual(new Set([ELEMENT_COLORS.C, ELEMENT_COLORS.N, ELEMENT_COLORS.O]));
    for (let i = 1; i < items.length; i++) expect(items[i].z).toBeGreaterThanOrEqual(items[i - 1].z);
    // atom balls are wider than the sticks, as on the product page (sphere 0.22 × vdW vs stick 0.14 Å)
    const ball = balls[0] as Extract<(typeof items)[number], { kind: "ball" }>;
    const stick = sticks.find((x) => x.kind === "stick" && x.w > 0) as Extract<(typeof items)[number], { kind: "stick" }>;
    expect(ball.r * 2).toBeGreaterThan(stick.w);
  });

  it("shades a colour lighter or darker", () => {
    expect(shade("#1C1A15", 0)).toBe("rgb(28,26,21)");
    expect(shade("#000000", 0.5)).toBe("rgb(128,128,128)");
    expect(shade("#A32B1F", -1)).toBe("rgb(0,0,0)");
  });
});
