import { compounds as listedCompounds } from "@/data/catalog";
import type { Compound } from "@/data/catalog";

// Compounds around the homepage sphere. Only active (listed) SKUs ever
// render, each linking to its product page: names and classes come from the
// catalog, and a slug that stops being listed drops off the ring along with
// any pair that uses it. Order matters — index 0 sits at the top of the
// ring, then clockwise from there.
export const SPHERE_SLUGS = [
  "slu-pp-332",
  "mots-c",
  "bpc-157",
  "tesamorelin",
  "cjc-1295-ipamorelin",
  "epithalon",
] as const;

// Highlighted connectors only ever join two compounds of the same chemical
// class, captioned with that class — never a combination or an outcome.
export const SPHERE_PAIRS: [string, string][] = [
  ["slu-pp-332", "mots-c"],
  ["tesamorelin", "cjc-1295-ipamorelin"],
];

export type SphereNode = { key: string; name: string; cls: string; href: string };
export type SpherePair = { a: string; b: string; text: string };

export function sphereNodes(list: Compound[] = listedCompounds): SphereNode[] {
  return SPHERE_SLUGS.flatMap((slug) => {
    const c = list.find((x) => x.slug === slug);
    return c ? [{ key: c.slug, name: c.name, cls: c.chemicalClass, href: `/products/${c.slug}` }] : [];
  });
}

export function spherePairs(nodes: SphereNode[]): SpherePair[] {
  return SPHERE_PAIRS.flatMap(([a, b]) => {
    const na = nodes.find((n) => n.key === a);
    const nb = nodes.find((n) => n.key === b);
    if (!na || !nb || na.cls !== nb.cls) return [];
    return [{ a, b, text: `${na.name} · ${nb.name} — ${na.cls}` }];
  });
}
