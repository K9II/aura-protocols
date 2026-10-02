// SS-31 strand drawn inside the homepage sphere (2026-10-02, option C).
// Same model file and look as the product-page viewer (MoleculeViewer: 3Dmol
// stick radius 0.14 Å, sphere scale 0.22 × van der Waals radius, element
// colours from lib/structure), drawn on the sphere's 2D canvas so the homepage
// never loads 3Dmol.
import { ELEMENT_COLORS } from "./structure";

export type StrandAtom = { x: number; y: number; z: number; el: string };
export type StrandBond = { a: number; b: number; order: number };
export type Strand = { atoms: StrandAtom[]; bonds: StrandBond[]; pxPerAngstrom: number };
export type Point = { x: number; y: number; z: number };
export type Projected = Point & { f: number }; // f = perspective scale at that depth
export type DrawItem =
  | { kind: "ball"; z: number; x: number; y: number; r: number; color: string }
  | { kind: "stick"; z: number; x1: number; y1: number; x2: number; y2: number; w: number; color: string };

const STICK_RADIUS_A = 0.14;
const SPHERE_SCALE = 0.22;
const VDW_A: Record<string, number> = { C: 1.7, N: 1.55, O: 1.52, S: 1.8, P: 1.8, Cu: 1.4 };
const DOUBLE_RADIUS = 0.45; // each stick of a double bond, relative to a single bond
const DOUBLE_OFFSET = 1.1;  // gap between the two sticks, in single-stick radii

// V2000 molfile: counts on line 4, then fixed-width atom and bond blocks.
export function parseSdf(text: string): { atoms: StrandAtom[]; bonds: StrandBond[] } {
  const L = text.split(/\r?\n/);
  const na = parseInt(L[3].slice(0, 3), 10), nb = parseInt(L[3].slice(3, 6), 10);
  if (!(na > 0) || !(nb >= 0)) throw new Error("not a V2000 molfile");
  const atoms: StrandAtom[] = [];
  for (let i = 0; i < na; i++) {
    const s = L[4 + i];
    // canvas y grows downward, molfile y upward
    atoms.push({ x: parseFloat(s.slice(0, 10)), y: -parseFloat(s.slice(10, 20)), z: parseFloat(s.slice(20, 30)), el: s.slice(31, 34).trim() });
  }
  const bonds: StrandBond[] = [];
  for (let i = 0; i < nb; i++) {
    const s = L[4 + na + i];
    bonds.push({ a: parseInt(s.slice(0, 3), 10) - 1, b: parseInt(s.slice(3, 6), 10) - 1, order: parseInt(s.slice(6, 9), 10) || 1 });
  }
  return { atoms, bonds };
}

// Centred on the molecule's centroid; the farthest atom lands at `radius` px.
export function buildStrand(text: string, radius: number): Strand {
  const { atoms, bonds } = parseSdf(text);
  const n = atoms.length;
  const c = atoms.reduce((m, a) => ({ x: m.x + a.x / n, y: m.y + a.y / n, z: m.z + a.z / n }), { x: 0, y: 0, z: 0 });
  const far = Math.max(...atoms.map((a) => Math.hypot(a.x - c.x, a.y - c.y, a.z - c.z)));
  const k = radius / far;
  return {
    atoms: atoms.map((a) => ({ el: a.el, x: (a.x - c.x) * k, y: (a.y - c.y) * k, z: (a.z - c.z) * k })),
    bonds,
    pxPerAngstrom: k,
  };
}

const colorOf = (el: string) => ELEMENT_COLORS[el] ?? ELEMENT_COLORS.C;

// Everything to paint for one frame, sorted back to front. Each bond is split
// at its midpoint and each half takes its atom's colour, as 3Dmol does.
export function strandDrawItems(s: Strand, rotate: (p: Point) => Point, project: (x: number, y: number, z: number) => Projected): DrawItem[] {
  const pts = s.atoms.map((a) => { const r = rotate(a); return project(r.x, r.y, r.z); });
  const items: DrawItem[] = [];
  s.atoms.forEach((a, i) => {
    const p = pts[i];
    items.push({ kind: "ball", z: p.z, x: p.x, y: p.y, r: SPHERE_SCALE * (VDW_A[a.el] ?? 1.7) * s.pxPerAngstrom * p.f, color: colorOf(a.el) });
  });
  for (const bd of s.bonds) {
    const pa = pts[bd.a], pb = pts[bd.b];
    const mx = (pa.x + pb.x) / 2, my = (pa.y + pb.y) / 2, mz = (pa.z + pb.z) / 2;
    const f = (pa.f + pb.f) / 2;
    const rad = STICK_RADIUS_A * s.pxPerAngstrom * f;
    const len = Math.hypot(pb.x - pa.x, pb.y - pa.y) || 1;
    const nx = -(pb.y - pa.y) / len, ny = (pb.x - pa.x) / len; // screen-space normal
    const offsets = bd.order >= 2 ? [-DOUBLE_OFFSET * rad, DOUBLE_OFFSET * rad] : [0];
    const w = 2 * rad * (bd.order >= 2 ? DOUBLE_RADIUS : 1);
    for (const o of offsets) {
      const ox = nx * o, oy = ny * o;
      items.push({ kind: "stick", z: (pa.z + mz) / 2, x1: pa.x + ox, y1: pa.y + oy, x2: mx + ox, y2: my + oy, w, color: colorOf(s.atoms[bd.a].el) });
      items.push({ kind: "stick", z: (pb.z + mz) / 2, x1: mx + ox, y1: my + oy, x2: pb.x + ox, y2: pb.y + oy, w, color: colorOf(s.atoms[bd.b].el) });
    }
  }
  return items.sort((p, q) => p.z - q.z);
}

// Mix a hex colour toward white (amt > 0) or black (amt < 0); used for the lit-sphere look.
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt)));
  return `rgb(${ch.join(",")})`;
}
