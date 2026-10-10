import Link from "next/link";
import { researchSummary } from "@/lib/research-summary";
import { BLOG_PUBLISHED } from "@/lib/constants";

// Research summary band on the product page (approved 2026-10-10, MOTS-c demo): an
// extract of the compound's guide with a link to the full summary. Shown only while
// the blog is published, so the link never leads to a missing page.
export default function ResearchSummary({ productSlug, name }: { productSlug: string; name: string }) {
  if (!BLOG_PUBLISHED) return null;
  const s = researchSummary(productSlug);
  if (!s) return null;
  return (
    <section className="s-rs" aria-labelledby="research-summary">
      <div>
        <h2 id="research-summary" className="s-h2">Research <em>summary</em></h2>
        <p className="s-rs-lede">A short extract from our {name} research literature summary. The full summary has the studies, the references and the regulatory detail.</p>
        <dl className="s-rs-meta">
          <div><dt className="s-micro">Evidence</dt><dd>Published laboratory research</dd></div>
          <div><dt className="s-micro">References</dt><dd>{s.referenceCount}</dd></div>
          <div><dt className="s-micro">Updated</dt><dd>{s.updated}</dd></div>
          <div><dt className="s-micro">Read time</dt><dd>{s.readTime}</dd></div>
        </dl>
      </div>
      <div>
        <article className="s-rs-card">
          <h3 className="s-rs-t">{s.title}</h3>
          <p className="s-rs-ex">{s.excerpt}</p>
          {s.highlights.length > 0 && (
            <div className="s-rs-list">
              <p className="s-micro">Research highlights</p>
              <ul className="s-rs-hl">{s.highlights.map((h) => <li key={h}>{h}</li>)}</ul>
            </div>
          )}
          <div className="s-rs-list">
            <p className="s-micro">Where research is heading</p>
            <ul className="s-rs-fw">{s.heading.map((h) => <li key={h}>{h}</li>)}</ul>
          </div>
          <div className="s-rs-ft">
            <span className="s-micro">{s.referenceCount} references · updated {s.updated}</span>
            <Link href={s.href}>Read the full research summary →</Link>
          </div>
        </article>
        {s.disclaimer && <p className="s-rs-disc">{s.disclaimer}</p>}
      </div>
    </section>
  );
}
