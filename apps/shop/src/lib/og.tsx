import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Share (Open Graph) images are fixed brand pictures (Kearney, 2026-10-02):
// the homepage uses the biosphere, product and blog pages use the emblem.
// Both are 1200x630 PNGs in public/og, captured from the live site
// (re-capture biosphere.png if the sphere's compounds change).
export const OG_SIZE = { width: 1200, height: 630 };

export async function ogPicture(file: "biosphere.png" | "emblem.png") {
  const png = await readFile(join(process.cwd(), "public/og", file));
  const src = `data:image/png;base64,${png.toString("base64")}`;
  // eslint-disable-next-line @next/next/no-img-element
  return new ImageResponse(<img src={src} width={OG_SIZE.width} height={OG_SIZE.height} alt="" />, OG_SIZE);
}
