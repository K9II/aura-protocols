// The five legal pages, in footer order. PolicyPage uses this for the
// closing "related policies" links. Relative imports only.
export type PolicySlug = "terms" | "refund-policy" | "shipping" | "privacy" | "ruo";

export const POLICIES: { slug: PolicySlug; title: string; href: string }[] = [
  { slug: "terms", title: "Terms of Service", href: "/terms" },
  { slug: "refund-policy", title: "Refund & Dispute Policy", href: "/refund-policy" },
  { slug: "shipping", title: "Shipping Policy", href: "/shipping" },
  { slug: "privacy", title: "Privacy Policy", href: "/privacy" },
  { slug: "ruo", title: "Research Use Only", href: "/ruo" },
];
