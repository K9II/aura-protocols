// Maps a product slug to its comprehensive research guide, when one exists.
// Only add a product here once its guide has been reviewed and approved —
// "Learn more" falls back to the product page for everything else.
export const PRODUCT_GUIDES: Record<string, string> = {
  "bpc-157": "/blog/bpc-157-complete-guide",
  "tb-500": "/blog/tb-500-complete-guide",
  "pt-141": "/blog/pt-141-melanocortin-bremelanotide-guide",
  "retatrutide": "/blog/retatrutide-research-guide",
  "tirzepatide": "/blog/tirzepatide-research-guide",
  "cjc-1295-ipamorelin": "/blog/cjc-1295-ipamorelin-stack",
  "ss-31": "/blog/ss-31-elamipretide-research-guide",
  "slu-pp-332": "/blog/slu-pp-332-research-guide",
  "epithalon": "/blog/epithalon-research-guide",
  "sermorelin": "/blog/sermorelin-research-guide",
  "mots-c": "/blog/mots-c-research-guide",
  "ghk-cu": "/blog/ghk-cu-research-guide",
  "igf-1-lr3": "/blog/igf-1-lr3-research-guide",
  "nad-plus": "/blog/nad-plus-research-guide",
  "semaglutide": "/blog/semaglutide-research-guide",
  "cagrilintide": "/blog/cagrilintide-research-guide",
  "tesamorelin": "/blog/tesamorelin-research-guide",
  "aod-9604": "/blog/aod-9604-research-guide",
  "kpv": "/blog/kpv-research-guide",
  "dsip": "/blog/dsip-research-guide",
  // Each Stacks product routes to its own guide — approved 2026-07-29.
  // The comparison piece (wolverine-vs-glow-vs-klow) lives in the blog
  // library and is cross-linked from all three individual guides, but
  // isn't itself a "Learn more" target.
  "bpc-157-tb-500-blend": "/blog/wolverine-stack-research-guide",
  "glow-stack": "/blog/glow-blend-research-guide",
  "klow-stack": "/blog/klow-blend-research-guide",
  "retatrutide-cagrilintide": "/blog/retatrutide-cagrilintide-research-guide",
  "cagrisema": "/blog/cagrisema-research-guide",
  "glutathione": "/blog/glutathione-research-guide",
};

export function learnMoreHref(productSlug: string): string {
  return PRODUCT_GUIDES[productSlug] ?? `/products/${productSlug}`;
}
