// apps/modality/src/lib/schema.ts
//
// Builders for the structured data (schema.org JSON-LD) that leaf pages emit.
// Keeping these as data builders (not inline markup) lets a leaf declare its FAQ
// once and render BOTH the visible <div> and the JSON-LD from the same array —
// so the markup can never drift from what a searcher sees (a Google requirement).
//
// Render the output with <JsonLd> (components/JsonLd.tsx). New leaves add rich
// results in one line; see any weight-loss leaf for the pattern.

import { BASE_URL, absoluteUrl } from "./site";

export type Crumb = { name: string; path: string };
export type QA = { q: string; a: string };

/** BreadcrumbList — e.g. Home › Weight Loss › Why GLP-1 dose varies. */
export function breadcrumbSchema(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path),
    })),
  };
}

/** FAQPage — the Q/A array must match the FAQ rendered on the page verbatim. */
export function faqSchema(items: QA[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}

/**
 * MedicalWebPage identity for an informational health leaf. `path` is the
 * canonical route; `reviewedBy` defaults to the telehealth partner framing.
 */
export function medicalWebPageSchema(opts: {
  name: string;
  description: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name: opts.name,
    description: opts.description,
    url: absoluteUrl(opts.path),
    isPartOf: { "@type": "WebSite", name: "Modality", url: BASE_URL },
  };
}
