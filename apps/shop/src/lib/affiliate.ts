import { products } from "../data/products";
import { posts } from "../data/posts";
import { comparisons } from "../data/comparisons";

const VENDOR_IDS: Record<string, string> = {
  "Limitless Life Nootropics": "limitless",
  "Swiss Chems": "swiss-chems",
  "Apollo Peptide Sciences": "apollo",
  "GLP-1 Research Lab": "glp1-lab",
  "Ignite Peptides": "ignite",
};

export function vendorId(vendorName: string): string {
  const id = VENDOR_IDS[vendorName];
  if (!id) throw new Error(`Unknown vendor for /go/ slug: "${vendorName}"`);
  return id;
}

export function goSlug(vendorName: string, productSlug?: string): string {
  const v = vendorId(vendorName);
  const tail = productSlug ? `${v}-${productSlug}` : v;
  return `aura-${tail}`;
}

export function goUrl(vendorName: string, productSlug?: string): string {
  return `/go/${goSlug(vendorName, productSlug)}`;
}

export type AffiliateRedirect = {
  source: string;
  destination: string;
  permanent: false;
};

export function buildAffiliateRedirects(): AffiliateRedirect[] {
  const map = new Map<string, string>();

  const add = (slug: string, destination: string) => {
    const existing = map.get(slug);
    if (existing && existing !== destination) {
      throw new Error(
        `Affiliate slug collision for /go/${slug}: "${existing}" vs "${destination}"`,
      );
    }
    map.set(slug, destination);
  };

  for (const p of products) {
    for (const v of p.vendors) {
      add(goSlug(v.vendor, p.slug), v.url);
    }
  }

  for (const post of posts) {
    for (const s of post.content) {
      if (s.type === "cta" && s.vendor && s.affiliateUrl) {
        add(goSlug(s.vendor, s.productSlug), s.affiliateUrl);
      }
    }
  }

  for (const c of comparisons) {
    add(goSlug(c.vendorA), c.vendorAUrl);
    add(goSlug(c.vendorB), c.vendorBUrl);
  }

  return Array.from(map.entries()).map(([slug, destination]) => ({
    source: `/go/${slug}`,
    destination,
    permanent: false,
  }));
}
