import { compounds } from "@/data/catalog";
import { OG_SIZE, ogPicture } from "@/lib/og";

export const alt = "Aura Protocols";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return compounds.map((c) => ({ slug: c.slug }));
}

export default function Image() {
  return ogPicture("emblem.png");
}
