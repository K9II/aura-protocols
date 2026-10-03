import { OG_SIZE, ogPicture } from "@/lib/og";

export const alt = "Aura Protocols — research peptides, separated, measured and published";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogPicture("biosphere.png");
}
