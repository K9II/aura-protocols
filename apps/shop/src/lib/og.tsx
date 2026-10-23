import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Share (Open Graph) images are fixed brand pictures. The homepage — the card
// shown whenever auraprotocols.com is texted or emailed — uses brand.png, the
// "house vial" card (Alvester picked option C, 2026-10-23: timeless, no launch
// wording, never "a certificate for every lot"; the ISO lab line instead). It
// is rendered with the site's own fonts so the lockup matches the header.
// Product and blog pages use the emblem. All are 1200x630 PNGs in public/og.
export const OG_SIZE = { width: 1200, height: 630 };

export async function ogPicture(file: "brand.png" | "biosphere.png" | "emblem.png") {
  const png = await readFile(join(process.cwd(), "public/og", file));
  const src = `data:image/png;base64,${png.toString("base64")}`;
  // eslint-disable-next-line @next/next/no-img-element
  return new ImageResponse(<img src={src} width={OG_SIZE.width} height={OG_SIZE.height} alt="" />, OG_SIZE);
}
