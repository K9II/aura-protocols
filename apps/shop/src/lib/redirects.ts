// Every redirect the shop declares. RELATIVE IMPORTS ONLY (next.config.ts).
import { compounds } from "../data/catalog";

export type Redirect = { source: string; destination: string; permanent: boolean };

const REMOVED_TO_PRODUCTS = ["/calculator", "/cheat-sheet", "/cheat-sheet/print", "/playbook", "/clinical-waitlist", "/masters", "/women"];
const REMOVED_TO_HOME = ["/validate/:path*", "/telehealth", "/telehealth/:path*"];

export const SLUG_RENAMES: Record<string, string> = {
  "glow-stack": "bpc-157-tb-500-ghk-cu",
  "klow-stack": "bpc-157-tb-500-ghk-cu-kpv",
};

// Affiliate-era vendor ids used in /go/aura-<vendor>-<product> links (lib/affiliate.ts, removed).
const GO_VENDOR_IDS = ["ignite", "peak-lab", "pspeptides", "american-peptides", "evolve", "improved"];

export function buildRedirects({ blogPublished }: { blogPublished: boolean }): Redirect[] {
  const out: Redirect[] = [];
  for (const s of REMOVED_TO_PRODUCTS) out.push({ source: s, destination: "/products", permanent: true });
  for (const s of REMOVED_TO_HOME) out.push({ source: s, destination: "/", permanent: true });
  for (const [from, to] of Object.entries(SLUG_RENAMES)) out.push({ source: `/products/${from}`, destination: `/products/${to}`, permanent: true });

  const oldSlugs = [...compounds.map((c) => c.slug), ...Object.keys(SLUG_RENAMES)];
  for (const v of GO_VENDOR_IDS) {
    for (const slug of oldSlugs) {
      out.push({ source: `/go/aura-${v}-${slug}`, destination: `/products/${SLUG_RENAMES[slug] ?? slug}`, permanent: true });
    }
  }
  out.push({ source: "/go/:path*", destination: "/products", permanent: true });

  if (!blogPublished) {
    out.push({ source: "/blog", destination: "/", permanent: false });
    out.push({ source: "/blog/:path*", destination: "/", permanent: false });
  }
  return out;
}
