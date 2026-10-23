// Renders the email logo (the sample email's lockup) to public/email/aura-logo.png at 2x.
// Gmail strips inline SVG, so marketing emails use this PNG.
// Usage: node scripts/email-logo.mjs   (needs the repo's Playwright)
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";

const out = fileURLToPath(new URL("../public/email/aura-logo.png", import.meta.url));
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="118" height="74" viewBox="22.5 66 53.5 33.5"><g transform="translate(23,66) scale(.175)" fill="none" stroke="#1C1A15" stroke-linecap="round" stroke-width="8"><g transform="translate(6,4) skewX(-7)"><path d="M30,128 L63,23"/><path d="M77,23 L124,128"/><path stroke="#A32B1F" stroke-width="5.5" d="M44,110 L56,86 L68,86 L74,68 L80,108 L86,86 L100,86"/></g></g><text x="43" y="89.5" font-family="Newsreader,Georgia,serif" font-size="22" font-weight="500" fill="#A32B1F" letter-spacing="-.3">ura</text><text x="58" y="98" font-family="Newsreader,Georgia,serif" font-size="6.6" font-weight="500" fill="#4A4438" letter-spacing=".3" text-anchor="middle">Protocols</text></svg>`;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 118, height: 74 }, deviceScaleFactor: 2 });
await p.setContent(`<html><head><link href="https://fonts.googleapis.com/css2?family=Newsreader:wght@500&display=swap" rel="stylesheet"><style>html,body{margin:0;background:transparent}</style></head><body>${svg}</body></html>`, { waitUntil: "networkidle" });
await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: out, omitBackground: true, clip: { x: 0, y: 0, width: 118, height: 74 } });
await b.close();
console.log("wrote", out);
