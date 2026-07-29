// Maps a product slug to its comprehensive research guide, when one exists.
// Only add a product here once its guide has been reviewed and approved —
// "Learn more" falls back to the product page for everything else.
export const PRODUCT_GUIDES: Record<string, string> = {
  "bpc-157": "/blog/bpc-157-complete-guide",
  "retatrutide": "/blog/retatrutide-research-guide",
  "semaglutide": "/blog/semaglutide-research-guide",
  "tesamorelin": "/blog/tesamorelin-research-guide",
  "aod-9604": "/blog/aod-9604-research-guide",
  "kpv": "/blog/kpv-research-guide",
  // Each Stacks product routes to its own guide — approved 2026-07-29.
  // The comparison piece (wolverine-vs-glow-vs-klow) lives in the blog
  // library and is cross-linked from all three individual guides, but
  // isn't itself a "Learn more" target.
  "bpc-157-tb-500-blend": "/blog/wolverine-stack-research-guide",
  "glow-stack": "/blog/glow-blend-research-guide",
  "klow-stack": "/blog/klow-blend-research-guide",
};

export function learnMoreHref(productSlug: string): string {
  return PRODUCT_GUIDES[productSlug] ?? `/products/${productSlug}`;
}
