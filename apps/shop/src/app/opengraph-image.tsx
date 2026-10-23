import { OG_SIZE, ogPicture } from "@/lib/og";

export const alt = "Aura Protocols — research peptides, tested by an ISO/IEC 17025-accredited US lab";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogPicture("brand.png");
}
