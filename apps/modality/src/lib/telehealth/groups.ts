import type { CatalogProduct } from "./types";

// Curated, not derived from the API — LegUpRx's catalog has no brand/generic
// flag. Small, well-known drug classes (GLP-1s, ED meds) mean this list
// changes rarely; revisit when new products are onboarded.
const BRAND_NAMES = new Set([
  "Ozempic", "Wegovy", "Mounjaro", "Zepbound", // GLP-1
  "Cialis", "Viagra", // ED
]);

export type ProductGroup = { heading: string | null; products: CatalogProduct[] };

function byPrice(a: CatalogProduct, b: CatalogProduct): number {
  return (a.fromPrice?.amount ?? 0) - (b.fromPrice?.amount ?? 0);
}

/** Split a category's products into Compounded vs. Brand-name groups, each
 *  sorted cheapest-first. Non-purchasable products (no fromPrice) are
 *  dropped. When no brand-name product is present, returns a single group
 *  with heading:null instead of an empty "Brand-name" group. */
export function groupProducts(products: CatalogProduct[]): ProductGroup[] {
  const purchasable = products.filter((p) => p.fromPrice);
  const brand = purchasable.filter((p) => BRAND_NAMES.has(p.name));
  const compounded = purchasable.filter((p) => !BRAND_NAMES.has(p.name));

  if (compounded.length && brand.length) {
    return [
      { heading: "Compounded", products: [...compounded].sort(byPrice) },
      { heading: "Brand-name", products: [...brand].sort(byPrice) },
    ];
  }
  return [{ heading: null, products: [...purchasable].sort(byPrice) }];
}
