// Product-page research summary (approved 2026-10-10, MOTS-c demo): a short extract of the
// compound's research literature summary (data/posts.ts) — its excerpt, Research
// Highlights and Where Research Is Heading — with a link to the full guide. Mechanisms,
// animal detail, FAQ and regulatory history stay in the guide only. Pure.
import { posts, type Post, type Section } from "@/data/posts";

// Guides whose slug isn't "<product>-research-guide".
const GUIDE_SLUG: Record<string, string> = {
  "bpc-157": "bpc-157-complete-guide",
  "tb-500": "tb-500-complete-guide",
  "ss-31": "ss-31-elamipretide-research-guide",
  "pt-141": "pt-141-melanocortin-bremelanotide-guide",
  "bpc-157-tb-500-blend": "wolverine-stack-research-guide",
  "bpc-157-tb-500-ghk-cu": "glow-blend-research-guide",
  "bpc-157-tb-500-ghk-cu-kpv": "klow-blend-research-guide",
};

export function guideFor(productSlug: string): Post | undefined {
  const slug = GUIDE_SLUG[productSlug] ?? `${productSlug}-research-guide`;
  return posts.find((p) => p.slug === slug && p.ruo);
}

export type ResearchSummary = {
  title: string;
  excerpt: string;
  highlights: string[];
  heading: string[];
  referenceCount: number;
  updated: string;
  readTime: string;
  href: string;
  disclaimer: string;
};

// The list that follows an h2 with this text.
function listAfter(content: Section[], h2: string): string[] {
  const i = content.findIndex((s) => s.type === "h2" && s.text === h2);
  const next = i >= 0 ? content[i + 1] : undefined;
  return next?.type === "ul" ? next.items ?? [] : [];
}

// Numbered reference paragraphs after the "References" heading.
function countReferences(content: Section[]): number {
  const i = content.findIndex((s) => s.type === "h2" && s.text === "References");
  if (i < 0) return 0;
  let n = 0;
  for (const s of content.slice(i + 1)) {
    if (s.type !== "p") break;
    const first = s.parts?.[0] ?? s.text ?? "";
    if (typeof first === "string" && /^\d+\.\s/.test(first)) n++;
  }
  return n;
}

export function researchSummary(productSlug: string): ResearchSummary | null {
  const g = guideFor(productSlug);
  if (!g) return null;
  const heading = listAfter(g.content, "Where Research Is Heading");
  if (!heading.length) return null;
  return {
    title: g.title,
    excerpt: g.excerpt,
    highlights: listAfter(g.content, "Research Highlights"),
    heading,
    referenceCount: countReferences(g.content),
    updated: g.lastUpdated ?? g.date,
    readTime: g.readTime.replace(/\s*read$/i, ""),
    href: `/blog/${g.slug}`,
    disclaimer: g.content.find((s) => s.type === "disclaimer")?.text ?? "",
  };
}
