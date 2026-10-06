// Procedural Christmas tree for the holiday offer panel, ported from the
// approved mock's generator (private repo, 2026-10-05-google-signin-mocks/
// tree-generator.cjs). Seeded, so the server renders the same string every
// time. Every id is prefixed "s-offer-" (other SVGs share the page).
// Pure — returns an SVG string; CSS (.s-offer-glow/.s-offer-starglow) twinkles it.
import { rng } from "@/lib/holiday/rng";

export const TREE_W = 260;
export const TREE_H = 300;
export const TREE_SEED = 11; // the seed recorded in the mock

const f1 = (n: number) => n.toFixed(1);

export function treeSvg({ seed = TREE_SEED }: { seed?: number } = {}): string {
  const W = TREE_W, H = TREE_H;
  const r = rng(seed), cx = W / 2, top = 34, base = H - 46;
  const tiers = 7, out: string[] = [];
  out.push(`<defs>`
    + `<radialGradient id="s-offer-bulbR" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#FFB3A6"/><stop offset=".35" stop-color="#D2362A"/><stop offset="1" stop-color="#5E120C"/></radialGradient>`
    + `<radialGradient id="s-offer-bulbG" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#FFF1B8"/><stop offset=".4" stop-color="#D9A93A"/><stop offset="1" stop-color="#6B4A0E"/></radialGradient>`
    + `<radialGradient id="s-offer-tglow" r="50%"><stop offset="0" stop-color="#FFE7A3" stop-opacity=".95"/><stop offset=".4" stop-color="#FFC861" stop-opacity=".45"/><stop offset="1" stop-color="#FFC861" stop-opacity="0"/></radialGradient>`
    + `<radialGradient id="s-offer-starglowfill" r="50%"><stop offset="0" stop-color="#FFF4C9" stop-opacity=".9"/><stop offset="1" stop-color="#FFD66B" stop-opacity="0"/></radialGradient>`
    + `<linearGradient id="s-offer-trunk" x1="0" x2="1"><stop offset="0" stop-color="#3B2414"/><stop offset=".5" stop-color="#6A4325"/><stop offset="1" stop-color="#2E1B0F"/></linearGradient>`
    + `<linearGradient id="s-offer-snowbank" y1="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#D9E2EA"/></linearGradient>`
    + `</defs>`);
  // trunk + snow bank
  out.push(`<rect x="${cx - 9}" y="${base - 10}" width="18" height="30" fill="url(#s-offer-trunk)"/>`);
  out.push(`<path d="M${cx - 110} ${base + 26} Q${cx - 60} ${base + 6} ${cx} ${base + 14} Q${cx + 70} ${base + 4} ${cx + 112} ${base + 26} Z" fill="url(#s-offer-snowbank)" opacity=".95"/>`);
  // tiers from bottom to top
  const greens = ["#0E3B22", "#14492A", "#1A5732", "#21663B", "#2B7745"];
  const lights: Array<[number, number, number]> = [], bulbs: Array<[number, number, number, number]> = [], snows: string[] = [];
  for (let t = 0; t < tiers; t++) {
    const k = t / (tiers - 1);                 // 0 bottom .. 1 top
    const yb = base - k * (base - top - 30);    // tier base y
    const half = (1 - k) * 104 + 16;            // half width
    const hgt = 62 - k * 18;                    // tier height
    const yt = yb - hgt;
    // dark underside silhouette
    out.push(`<path d="M${cx} ${yt} Q${cx - half * 0.55} ${yb - hgt * 0.35} ${cx - half} ${yb} Q${cx - half * 0.5} ${yb - 9} ${cx} ${yb - 4} Q${cx + half * 0.5} ${yb - 9} ${cx + half} ${yb} Q${cx + half * 0.55} ${yb - hgt * 0.35} ${cx} ${yt} Z" fill="#0A2E1A"/>`);
    // needles: short strokes radiating down/out
    const n = Math.round(260 - k * 140);
    let d = "";
    for (let i = 0; i < n; i++) {
      const u = r(), v = r();
      const y = yt + v * hgt * 0.95;
      const span = ((y - yt) / hgt) * half;
      const x = cx + (u * 2 - 1) * span;
      const side = x < cx ? -1 : 1;
      const len = 5 + r() * 7;
      const ang = (0.35 + r() * 0.5) * side;
      const x2 = x + Math.sin(ang) * len, y2 = y + Math.cos(Math.abs(ang)) * len * 0.75;
      d += `M${f1(x)} ${f1(y)}L${f1(x2)} ${f1(y2)}`;
      if (i % 3 === 0) { out.push(`<path d="${d}" stroke="${greens[Math.floor(r() * greens.length)]}" stroke-width="${(1.1 + r() * 0.9).toFixed(2)}" stroke-linecap="round"/>`); d = ""; }
    }
    if (d) out.push(`<path d="${d}" stroke="${greens[2]}" stroke-width="1.4" stroke-linecap="round"/>`);
    // snow on the bough tips
    const tips = 5 + Math.round((1 - k) * 4);
    for (let i = 0; i <= tips; i++) {
      const x = cx - half + (2 * half * i) / tips;
      const sag = 6 + r() * 4;
      const y = yb - 4 + Math.abs(x - cx) / half * 4;
      snows.push(`<path d="M${f1(x - 9)} ${f1(y - sag + 2)} Q${f1(x)} ${f1(y - sag - 4)} ${f1(x + 9)} ${f1(y - sag + 2)} Q${f1(x)} ${f1(y - sag + 1)} ${f1(x - 9)} ${f1(y - sag + 2)} Z" fill="#F4F8FB" opacity="${(0.75 + r() * 0.25).toFixed(2)}"/>`);
    }
    // string lights: a gentle swag across the tier
    const swag = 7 + Math.round((1 - k) * 5);
    for (let i = 1; i < swag; i++) {
      const f = i / swag, x = cx - half * 0.85 + f * half * 1.7;
      const y = yb - hgt * 0.42 + Math.sin(f * Math.PI) * 8;
      lights.push([x, y, (i + t) % 3]);
    }
    // baubles
    const nb = 2 + Math.round((1 - k) * 2);
    for (let i = 0; i < nb; i++) {
      const f = (i + 0.5 + (r() - 0.5) * 0.4) / nb, x = cx - half * 0.7 + f * half * 1.4;
      const y = yb - 10 - r() * 6;
      bulbs.push([x, y, (i + t) % 2, 4.2 + (1 - k) * 2.2]);
    }
  }
  out.push(...snows);
  const lightCols = ["#FFD36B", "#FF8A6B", "#FFF2C2"];
  lights.forEach(([x, y, c], i) => out.push(`<circle class="s-offer-glow" cx="${f1(x)}" cy="${f1(y)}" r="7" fill="url(#s-offer-tglow)" style="animation-delay:${(i * 0.29 % 2.4).toFixed(2)}s"/><circle cx="${f1(x)}" cy="${f1(y)}" r="1.7" fill="${lightCols[c]}"/>`));
  bulbs.forEach(([x, y, c, rad]) => out.push(`<line x1="${f1(x)}" y1="${f1(y - rad - 4)}" x2="${f1(x)}" y2="${f1(y - rad)}" stroke="#C9A65A" stroke-width=".8"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(rad)}" fill="url(#${c ? "s-offer-bulbG" : "s-offer-bulbR"})"/><circle cx="${f1(x - rad * 0.35)}" cy="${f1(y - rad * 0.35)}" r="${f1(rad * 0.22)}" fill="#fff" opacity=".7"/>`));
  // star
  const sx = cx, sy = top - 4, R = 15, rr = 6.2;
  let sp = "";
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rad = i % 2 ? rr : R; sp += `${i ? "L" : "M"}${f1(sx + Math.cos(a) * rad)} ${f1(sy + Math.sin(a) * rad)}`; }
  out.push(`<circle class="s-offer-starglow" cx="${sx}" cy="${sy}" r="30" fill="url(#s-offer-starglowfill)"/><path d="${sp}Z" fill="#FFD66B" stroke="#FFF1C2" stroke-width=".8"/>`);
  return `<svg class="s-offer-tree-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax meet" overflow="visible" aria-hidden="true" focusable="false">${out.join("")}</svg>`;
}
