// The six approved photo vials for email (2026-10-23; public/email/vials/, made by
// scripts/email-vials.py). The strength is printed on the photographed label, so it
// lives here; name, nickname and class come from the catalog. Retatrutide and
// tirzepatide are never featured in email.
import { catalogContent } from "@/data/catalog";

const LABELS = {
  "bpc-157": { slug: "bpc-157", strength: "10 mg" },
  klow: { slug: "bpc-157-tb-500-ghk-cu-kpv", strength: "80 mg" },
  "nad-plus": { slug: "nad-plus", strength: "500 mg" },
  wolverine: { slug: "bpc-157-tb-500-blend", strength: "20 mg" },
  "ghk-cu": { slug: "ghk-cu", strength: "50 mg" },
  glow: { slug: "bpc-157-tb-500-ghk-cu", strength: "70 mg" },
} as const;

export type PhotoVialKey = keyof typeof LABELS;
export type PhotoVial = { key: PhotoVialKey; slug: string; strength: string; name: string; designation: string | null; chemicalClass: string };

export const PHOTO_VIALS = Object.fromEntries(
  (Object.keys(LABELS) as PhotoVialKey[]).map((key) => {
    const { slug, strength } = LABELS[key];
    const c = catalogContent.find((p) => p.slug === slug);
    if (!c) throw new Error(`photo vial ${key}: no catalog entry ${slug}`);
    return [key, { key, slug, strength, name: c.name, designation: c.designation ?? null, chemicalClass: c.chemicalClass }];
  }),
) as Record<PhotoVialKey, PhotoVial>;

export const photoVial = (key: PhotoVialKey): PhotoVial => PHOTO_VIALS[key];
