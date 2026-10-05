import { notFound } from "next/navigation";
import { catalogContent } from "@/data/catalog";
import { getLiveCatalogOrNull } from "@/lib/catalog-live";
import { OG_SIZE, ogPicture } from "@/lib/og";

export const alt = "Aura Protocols";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return catalogContent.map((c) => ({ slug: c.slug }));
}

// A hidden product has no share image. The image is the brand emblem (it
// names no product), so it still renders when the live catalog can't be read.
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const live = await getLiveCatalogOrNull();
  if (live && !live.shown.some((c) => c.slug === slug)) notFound();
  return ogPicture("emblem.png");
}
