// Records the coming-soon page's turning vial (BPC-157) frame by frame for the
// "A first look" email GIF (public/email/bpc-turn.gif). Then run email-vial-gif.py.
// Usage: STEP=200 TOTAL=32000 node scripts/email-vial-turn.mjs   (needs the repo's Playwright)
//
// Gotchas (2026-10-23):
// - The page clock must be frozen (clock.pauseAt) and stepped with runFor: each
//   screenshot takes ~1 s, and a running clock turns the vial between frames.
// - page.screenshot({ clip }), never an element screenshot: those scroll the page,
//   and the vial holds still while the page scrolls.
// - The flat 2-D vial under the 3-D one (and its children) must be invisible, or its
//   label shows through the glass as a second label.
import { chromium } from "playwright";
import { mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const STEP = Number(process.env.STEP || 200), TOTAL = Number(process.env.TOTAL || 32000), W = Number(process.env.W || 260);
const DIR = fileURLToPath(new URL("./.vial-frames/", import.meta.url));
rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });
const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: 1000, height: 1400 }, deviceScaleFactor: 2 });
await p.addInitScript((w) => {
  addEventListener("DOMContentLoaded", () => {
    const s = document.createElement("style");
    s.textContent = `html,body,body *:not(canvas){background:transparent!important;background-image:none!important;box-shadow:none!important}
      .s-vialturn{width:${w}px!important;max-width:none!important;flex:none!important} body *{visibility:hidden!important}
      .s-vialturn,.s-vialturn *{visibility:visible!important}
      .s-vialturn .s-vialturn-still,.s-vialturn .s-vialturn-still *{visibility:hidden!important;opacity:0!important}`;
    document.head.appendChild(s);
  });
}, W);
await p.clock.install();
await p.goto(process.env.SITE || "https://auraprotocols.com/", { waitUntil: "networkidle" });
const vt = await p.$(".s-vialturn");
await vt.scrollIntoViewIfNeeded();
await p.waitForFunction(() => document.querySelector(".s-vialturn.is-3d"));
await p.clock.pauseAt(Date.now() + 60000);
await p.clock.runFor(400);
const clip = await vt.boundingBox();
let i = 0;
for (let t = 0; t <= TOTAL; t += STEP) {
  await p.screenshot({ path: `${DIR}f${String(i++).padStart(4, "0")}.png`, omitBackground: true, clip });
  await p.clock.runFor(STEP);
}
console.log("frames", i, "in", DIR);
await b.close();
