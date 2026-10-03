import { posts } from "@/data/posts";
import { BLOG_PUBLISHED } from "@/lib/constants";
import { OG_SIZE, ogPicture } from "@/lib/og";

export const alt = "Aura Protocols";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return BLOG_PUBLISHED ? posts.map((p) => ({ slug: p.slug })) : [];
}

export default function Image() {
  return ogPicture("emblem.png");
}
