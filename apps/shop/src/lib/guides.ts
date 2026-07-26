// Maps a product slug to its comprehensive research guide, when one exists.
// Only add a product here once its guide has been reviewed and approved —
// "Learn more" falls back to the product page for everything else.
export const PRODUCT_GUIDES: Record<string, string> = {
  "bpc-157": "/blog/bpc-157-complete-guide",
  "retatrutide": "/blog/retatrutide-research-guide",
};

export function learnMoreHref(productSlug: string): string {
  return PRODUCT_GUIDES[productSlug] ?? `/products/${productSlug}`;
}
