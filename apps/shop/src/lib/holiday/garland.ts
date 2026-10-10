// Pine garland for the holiday offer panel, ported from the approved mock's
// generator (private repo, 2026-10-05-google-signin-mocks/garland-generator.cjs).
//
// Size-independent: the mock drew one SVG measured to the panel in the
// browser. Here nothing is measured. The needles and lights are SVG
// <pattern> tiles (userSpaceOnUse, so they never scale), defined once in
// garlandDefsSvg(). Each edge is a strip GARLAND_THICKNESS thick, centred on
// the panel edge by CSS (.s-offer-strip--top/right/bottom/left), whose SVG
// just paints those patterns over 100% of its box — so any panel width or
// height gets whole, evenly spaced needles. Holly + berries are fixed-size
// corner SVGs. Seeded and deterministic (server-rendered, no hydration drift).
// Every id is prefixed "s-offer-". Pure — returns SVG strings.
import { rng } from "@/lib/holiday/rng";

export const GARLAND_THICKNESS = 38;          // px; half of it sits outside the panel
export const HOLLY_BOX = 76;                  // px, each corner SVG
export const HOLLY_REACH = 28;                // px the holly may reach outside the panel corner (CSS offsets by this)
export const GARLAND_LIGHT_GAP = 46;          // px between lights, as in the mock
export const GARLAND_LIGHT_LAYERS = 6;        // one light per layer per tile; layers twinkle out of step
export const GARLAND_SEED = 5;                // the seed recorded in the mock

const GREENS = ["#0E3B22", "#14492A", "#1A5732", "#21663B", "#2B7745", "#327F4C"];
const LIGHT_COLS = ["#FFD36B", "#FF8A6B", "#FFF2C2"];
const f1 = (n: number) => n.toFixed(1);

type Seg = [number, number, number, number];

// One tile of needle clusters along a horizontal line at the strip's centre.
// Needles that cross the tile's left/right edge are drawn again one tile over,
// so the tile repeats without a seam.
function needleTile(tileW: number, spacing: number, seed: number): { paths: string[][]; colors: string[]; widths: string[] } {
  const r = rng(seed), mid = GARLAND_THICKNESS / 2;
  const segs: Seg[] = [];
  const clusters = Math.round(tileW / spacing);
  for (let i = 0; i < clusters; i++) {
    const x = (i + 0.5) * (tileW / clusters);
    for (let k = 0; k < 7; k++) {
      const ang = r() * Math.PI * 2, len = 6 + r() * 8;          // reach ≤ 4 + 14 = 18 < mid
      const x1 = x + (r() - 0.5) * 8, y1 = mid + (r() - 0.5) * 8;
      const x2 = x1 + Math.cos(ang) * len, y2 = y1 + Math.sin(ang) * len;
      segs.push([x1, y1, x2, y2]);
      if (Math.min(x1, x2) < 0) segs.push([x1 + tileW, y1, x2 + tileW, y2]);
      if (Math.max(x1, x2) > tileW) segs.push([x1 - tileW, y1, x2 - tileW, y2]);
    }
  }
  const paths: string[][] = [], colors: string[] = [], widths: string[] = [];
  for (let i = 0; i < segs.length; i += 14) {
    paths.push(segs.slice(i, i + 14).map(([a, b, c, d]) => `${f1(a)} ${f1(b)} ${f1(c)} ${f1(d)}`));
    colors.push(GREENS[Math.floor(r() * GREENS.length)]);
    widths.push((1.2 + r() * 1).toFixed(2));
  }
  return { paths, colors, widths };
}

// Horizontal ("h") tiles run along x; vertical ("v") ones are the same tile
// with x and y swapped.
function needlePattern(id: string, tileW: number, spacing: number, seed: number, dir: "h" | "v"): string {
  const { paths, colors, widths } = needleTile(tileW, spacing, seed);
  const body = paths.map((p, i) => {
    const d = p.map((s) => {
      const [a, b, c, e] = s.split(" ");
      return dir === "h" ? `M${a} ${b}L${c} ${e}` : `M${b} ${a}L${e} ${c}`;
    }).join("");
    return `<path d="${d}" stroke="${colors[i]}" stroke-width="${widths[i]}" stroke-linecap="round"/>`;
  }).join("");
  const [w, h] = dir === "h" ? [tileW, GARLAND_THICKNESS] : [GARLAND_THICKNESS, tileW];
  return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${w}" height="${h}">${body}</pattern>`;
}

function lightPattern(layer: number, dir: "h" | "v"): string {
  const tile = GARLAND_LIGHT_GAP * GARLAND_LIGHT_LAYERS, along = GARLAND_LIGHT_GAP * (layer + 0.5), mid = GARLAND_THICKNESS / 2;
  const [cx, cy] = dir === "h" ? [along, mid] : [mid, along];
  const [w, h] = dir === "h" ? [tile, GARLAND_THICKNESS] : [GARLAND_THICKNESS, tile];
  return `<pattern id="s-offer-lights${layer}-${dir}" patternUnits="userSpaceOnUse" width="${w}" height="${h}">`
    + `<circle cx="${cx}" cy="${cy}" r="8" fill="url(#s-offer-gl)"/><circle cx="${cx}" cy="${cy}" r="2" fill="${LIGHT_COLS[layer % LIGHT_COLS.length]}"/></pattern>`;
}

// Rendered once per panel (zero-size, hidden from assistive tech).
export function garlandDefsSvg(seed: number = GARLAND_SEED): string {
  const defs = [
    `<radialGradient id="s-offer-berry" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#FFB3A6"/><stop offset=".4" stop-color="#C92E22"/><stop offset="1" stop-color="#5E120C"/></radialGradient>`,
    `<radialGradient id="s-offer-gl" r="50%"><stop offset="0" stop-color="#FFE7A3" stop-opacity=".95"/><stop offset=".45" stop-color="#FFC861" stop-opacity=".4"/><stop offset="1" stop-color="#FFC861" stop-opacity="0"/></radialGradient>`,
  ];
  for (const dir of ["h", "v"] as const) {
    // Two needle layers with different tile lengths, so the repeat is hard to spot.
    defs.push(needlePattern(`s-offer-needles-${dir}`, 126, 11, seed, dir));
    defs.push(needlePattern(`s-offer-needles2-${dir}`, 154, 14, seed + 1, dir));
    for (let l = 0; l < GARLAND_LIGHT_LAYERS; l++) defs.push(lightPattern(l, dir));
  }
  return `<svg class="s-offer-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>${defs.join("")}</defs></svg>`;
}

// One edge: paints the patterns over its whole box. "h" for top/bottom, "v" for left/right.
export function garlandStripSvg(dir: "h" | "v"): string {
  const rect = (fill: string, cls = "") => `<rect${cls ? ` class="${cls}"` : ""} width="100%" height="100%" fill="url(#${fill})"/>`;
  const lights = Array.from({ length: GARLAND_LIGHT_LAYERS }, (_, l) => rect(`s-offer-lights${l}-${dir}`, `s-offer-lights s-offer-lights${l}`));
  return `<svg width="100%" height="100%" aria-hidden="true" focusable="false">${rect(`s-offer-needles-${dir}`)}${rect(`s-offer-needles2-${dir}`)}${lights.join("")}</svg>`;
}

// Holly + berries for one corner: 0 top-left, 1 top-right, 2 bottom-right,
// 3 bottom-left. The panel corner sits HOLLY_REACH in from the SVG's two
// outer edges; the sprig is drawn for the top-left and turned for the others.
export function hollySvg(corner: 0 | 1 | 2 | 3): string {
  const o = HOLLY_REACH, b = HOLLY_BOX - HOLLY_REACH;
  const [x, y] = [[o, o], [b, o], [b, b], [o, b]][corner];
  const rot = corner * 90;
  const leaf = (a: number) => `<g transform="translate(${x} ${y}) rotate(${rot + a})"><path d="M0 0 C6 -4 10 -4 14 -2 C13 -6 17 -8 19 -6 C20 -10 25 -10 27 -6 C30 -8 34 -6 33 -2 C36 -2 38 0 36 3 C30 3 22 5 14 4 C8 4 4 3 0 0 Z" fill="#1E5A33" stroke="#0E3B22" stroke-width=".8"/><path d="M2 0.5 L34 1" stroke="#3E8A55" stroke-width=".8"/></g>`;
  const berry = (dx: number, dy: number) => `<circle cx="${dx}" cy="${dy}" r="4.2" fill="url(#s-offer-berry)"/><circle cx="${dx - 1.3}" cy="${dy - 1.3}" r="1" fill="#fff" opacity=".7"/>`;
  const berries = `<g transform="translate(${x} ${y}) rotate(${rot})">${berry(0, 0)}${berry(6, 4)}${berry(-3, 6)}</g>`;
  return `<svg width="${HOLLY_BOX}" height="${HOLLY_BOX}" viewBox="0 0 ${HOLLY_BOX} ${HOLLY_BOX}" aria-hidden="true" focusable="false">${leaf(-35)}${leaf(25)}${leaf(95)}${berries}</svg>`;
}
