import { describe, it, expect } from "vitest";
import { posts, type Post, type Section } from "@/data/posts";
import { CHEMICAL_CLASSES } from "@/data/catalog";
import { RULES } from "../../scripts/compliance-scan.mjs";

// Guides rewritten to the research-summary template (ruo: true). Every rule the
// build scan applies to live pages, plus the template's own: no amounts, no
// human-study wording, no sourcing section or product button, no affiliate text,
// a chemical-class category and the RUO disclaimer.
const EXTRA: [string, RegExp][] = [
  ["wellness", /wellness/i],
  ["therapy", /therap/i],
  ["sourcing", /where to source|our index|vendors? who/i],
  ["affiliate", /affiliate|commission/i],
  ["amount", /\b\d+(\.\d+)?\s?(mcg|µg|μg|mg|iu)(\/kg)?\b/i],
  ["human study", /\b(patients?|participants?|volunteers?)\b/i],
  ["engine", /aura engine/i],
];
const NON_COMPOUND_CATEGORIES = ["Testing & Analysis"];
const RUO_DISCLAIMER = "All products sold by Aura Protocols are for research use only — not for human or veterinary use.";

function texts(s: Section): string[] {
  return [s.text ?? "", ...(s.items ?? []), ...(s.faq ?? []).flatMap((f) => [f.q, f.a]),
    ...(s.parts ?? []).map((p) => (typeof p === "string" ? p : p.text))];
}
// Everything on the page is checked, references included: the build's scan reads the
// whole rendered page, so a paper title with a banned word is shortened with "…".
function bodyText(p: Post): string {
  return [p.title, p.excerpt, ...p.content.flatMap(texts)].join(" \n ");
}

const ruo = posts.filter((p) => p.ruo);

describe("research-summary guides (ruo)", () => {
  it("includes the Semax and Selank summaries", () => {
    expect(ruo.map((p) => p.slug)).toEqual(expect.arrayContaining(["semax-research-guide", "selank-research-guide"]));
  });

  it.each(ruo.map((p) => [p.slug, p] as const))("%s follows every rule", (_slug, p) => {
    const t = bodyText(p);
    for (const [rule, re] of [...(RULES as [string, RegExp][]), ...EXTRA]) {
      const m = t.match(re);
      expect(m ? `${rule}: …${t.slice(Math.max(0, (m.index ?? 0) - 40), (m.index ?? 0) + 40)}…` : null).toBeNull();
    }
    expect(p.content.some((s) => s.type === "button" || s.type === "cta"), "no product button").toBe(false);
    expect([...CHEMICAL_CLASSES, ...NON_COMPOUND_CATEGORIES]).toContain(p.category);
    expect(p.title).not.toMatch(/complete/i);
    const disc = p.content.filter((s) => s.type === "disclaimer");
    expect(disc).toHaveLength(1);
    expect(disc[0].text).toContain(RUO_DISCLAIMER);
    expect(p.content[p.content.length - 1].type).toBe("disclaimer");
  });
});
