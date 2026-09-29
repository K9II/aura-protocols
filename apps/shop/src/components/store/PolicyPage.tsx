import type { ReactNode } from "react";
import Link from "next/link";
import PolicyToc from "@/components/store/PolicyToc";
import { POLICIES, type PolicySlug } from "@/lib/policies";
import { TERMS_VERSION } from "@/lib/gate-shared";

// Shared layout for the five legal pages. Copy lives in each page file.
// Pages must be reviewed by counsel before launch.
export type PolicySection = { id: string; heading: string; body: ReactNode };

export default function PolicyPage({ policy, title, updated, summary, sections, closing }: {
  policy: PolicySlug;
  title: ReactNode;
  updated: string;
  summary: { headline: ReactNode; detail?: ReactNode };
  sections: PolicySection[];
  closing?: ReactNode;
}) {
  const related = POLICIES.filter((p) => p.slug !== policy);
  return (
    <div className="pharmacopoeia">
      <div className="p-container py-16">
        <div className="max-w-[760px]">
          <p className="s-micro s-eyebrow">Legal</p>
          <h1 className="s-h1 mb-4">{title}</h1>
          <p className="s-micro text-[color:var(--ink-soft)] mb-8">Version {TERMS_VERSION} · Last updated {updated}</p>
        </div>
        <div className="s-policy-grid">
          <aside className="s-policy-rail">
            <PolicyToc items={sections.map(({ id, heading }) => ({ id, heading }))} />
          </aside>
          <div className="s-policy-body">
            <div className="s-policy-summary" data-testid="policy-summary">
              <p className="s-micro text-[color:var(--specimen)] mb-2">The short version</p>
              <p className="p-serif text-[22px] leading-snug">{summary.headline}</p>
              {summary.detail && <p className="text-[14.5px] leading-relaxed text-[color:var(--ink-soft)] mt-2">{summary.detail}</p>}
            </div>
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} data-policy-section className="s-policy-section">
                <p className="s-micro text-[color:var(--ink-soft)] mb-1.5" data-section-number>§ {String(i + 1).padStart(2, "0")}</p>
                <h2 className="p-serif text-[26px] leading-tight mb-3">{s.heading}</h2>
                <div className="text-[15.5px] leading-relaxed text-[color:var(--ink-soft)] space-y-3">{s.body}</div>
              </section>
            ))}
            <section className="s-policy-closing">
              <h2 className="p-serif text-[26px] leading-tight mb-3">{closing ? "Acknowledgment" : "Related policies"}</h2>
              {closing && <div className="text-[15.5px] leading-relaxed text-[color:var(--ink-soft)] mb-5">{closing}</div>}
              <nav aria-label="Related policies">
                <ul className="flex flex-wrap gap-x-6 gap-y-2 s-micro">
                  {related.map((p) => (
                    <li key={p.slug}><Link className="p-link" href={p.href}>{p.title} →</Link></li>
                  ))}
                </ul>
              </nav>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
