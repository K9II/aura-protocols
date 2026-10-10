// Every redirect the shop declares. RELATIVE IMPORTS ONLY (next.config.ts).
import { catalogContent } from "../data/catalog";

export type Redirect = { source: string; destination: string; permanent: boolean };

const REMOVED_TO_PRODUCTS = ["/calculator", "/cheat-sheet", "/cheat-sheet/print", "/playbook", "/clinical-waitlist", "/masters", "/women"];
const REMOVED_TO_HOME = ["/validate/:path*", "/telehealth", "/telehealth/:path*"];

export const SLUG_RENAMES: Record<string, string> = {
  "glow-stack": "bpc-157-tb-500-ghk-cu",
  "klow-stack": "bpc-157-tb-500-ghk-cu-kpv",
};

// Blog posts retired in the research-summary rewrite (2026-10-10). Human-use topics go to
// the blog index, never to a product's guide (a weight-loss or libido search must not land
// on a compound); the rest go to the summary that replaced them.
export const RETIRED_POSTS: Record<string, string> = {
  "wearable-engine-personalized-peptide-protocol": "/blog",
  "best-peptides-for-weight-loss": "/blog",
  "peptides-for-libido-sexual-health": "/blog",
  "why-glp1-dose-response-varies": "/blog",
  "wolverine-vs-glow-vs-klow": "/blog/wolverine-stack-research-guide",
  "cjc-1295-ipamorelin-stack": "/blog/cjc-1295-ipamorelin-research-guide",
};

// Affiliate-era vendor ids used in /go/aura-<vendor>-<product> links (lib/affiliate.ts, removed).
const GO_VENDOR_IDS = ["ignite", "peak-lab", "pspeptides", "american-peptides", "evolve", "improved"];

export function buildRedirects({ blogPublished }: { blogPublished: boolean }): Redirect[] {
  const out: Redirect[] = [];
  for (const s of REMOVED_TO_PRODUCTS) out.push({ source: s, destination: "/products", permanent: true });
  for (const s of REMOVED_TO_HOME) out.push({ source: s, destination: "/", permanent: true });
  for (const [from, to] of Object.entries(SLUG_RENAMES)) out.push({ source: `/products/${from}`, destination: `/products/${to}`, permanent: true });

  // Every content product (a hidden product's old link lands on its 404, as before).
  const oldSlugs = [...catalogContent.map((c) => c.slug), ...Object.keys(SLUG_RENAMES)];
  for (const v of GO_VENDOR_IDS) {
    for (const slug of oldSlugs) {
      out.push({ source: `/go/aura-${v}-${slug}`, destination: `/products/${SLUG_RENAMES[slug] ?? slug}`, permanent: true });
    }
  }
  out.push({ source: "/go/:path*", destination: "/products", permanent: true });

  if (blogPublished) {
    for (const [from, to] of Object.entries(RETIRED_POSTS)) out.push({ source: `/blog/${from}`, destination: to, permanent: true });
  } else {
    out.push({ source: "/blog", destination: "/", permanent: false });
    out.push({ source: "/blog/:path*", destination: "/", permanent: false });
  }
  return out;
}
