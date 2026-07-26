import Link from "next/link";
import type { Section, LinkPart } from "@/data/posts";
import { goUrl } from "@/lib/affiliate";

// Renders an array of post Sections in the pharmacopoeia theme. Used by the
// blog article renderer (/blog/[slug]). Caller must provide a `.pharmacopoeia`
// ancestor for the CSS custom properties these classes rely on.
export function renderSection(section: Section, i: number) {
  switch (section.type) {
    case "intro":
      return (
        <p key={i} className="text-lg text-[color:var(--ink-soft)] leading-relaxed border-l-2 border-[color:var(--specimen)]/40 pl-5 my-6">
          {section.text}
        </p>
      );
    case "h2":
      return (
        <h2 key={i} className="p-serif text-2xl mt-10 mb-4 text-[color:var(--ink)]">
          {section.text}
        </h2>
      );
    case "h3":
      return (
        <h3 key={i} className="p-serif-italic text-lg mt-6 mb-2 text-[color:var(--specimen)]">
          {section.text}
        </h3>
      );
    case "p":
      return (
        <p key={i} className="text-[color:var(--ink-soft)] leading-relaxed my-4">
          {section.parts
            ? section.parts.map((part, j) => {
                if (typeof part === "string") return part;
                const p = part as LinkPart;
                if (p.external) {
                  return (
                    <a
                      key={j}
                      href={p.href}
                      target="_blank"
                      rel={p.sponsored ? "noopener noreferrer sponsored" : "noopener noreferrer"}
                      className="p-link"
                    >
                      {p.text}
                    </a>
                  );
                }
                return (
                  <Link key={j} href={p.href} className="p-link">
                    {p.text}
                  </Link>
                );
              })
            : section.text}
        </p>
      );
    case "ul":
      return (
        <ul key={i} className="my-4 space-y-2">
          {section.items?.map((item, j) => (
            <li key={j} className="flex items-start gap-3 text-sm text-[color:var(--ink-soft)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--specimen)] mt-2 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      );
    case "callout":
      return (
        <div key={i} className="p-callout p-5 my-6">
          <p className="text-sm text-[color:var(--ink-soft)] leading-relaxed">{section.text}</p>
        </div>
      );
    case "cta":
      return (
        <div key={i} className="p-card p-6 my-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-[color:var(--ink-soft)] font-semibold mb-1">Recommended Vendor</p>
            <p className="font-semibold text-[color:var(--ink)]">{section.vendor}</p>
            {section.productSlug && (
              <Link href={`/products/${section.productSlug}`} className="text-xs p-link mt-1 inline-block">
                View compound details →
              </Link>
            )}
          </div>
          <a
            href={section.vendor ? goUrl(section.vendor, section.productSlug) : section.affiliateUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="p-btn-primary text-sm py-2.5 px-6 whitespace-nowrap"
          >
            {section.text} →
          </a>
        </div>
      );
    case "button":
      return section.productSlug ? (
        <Link
          key={i}
          href={`/products/${section.productSlug}`}
          className="p-btn-primary inline-block text-sm py-2.5 px-6 my-4"
        >
          {section.text} →
        </Link>
      ) : null;
    case "disclaimer":
      return (
        <p key={i} className="text-xs text-[color:var(--ink-soft)] border-t border-[color:var(--line)] pt-6 mt-8 leading-relaxed">
          {section.text}
        </p>
      );
    case "faq":
      return (
        <section key={i} className="my-10">
          <h2 className="p-serif text-2xl mt-10 mb-4 text-[color:var(--ink)]">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {section.faq?.map((item, j) => (
              <div key={j} className="p-card p-5">
                <p className="font-semibold text-[color:var(--ink)] mb-2">{item.q}</p>
                <p className="text-sm text-[color:var(--ink-soft)] leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </section>
      );
    default:
      return null;
  }
}

export default function PostBody({ content }: { content: Section[] }) {
  return <>{content.map((section, i) => renderSection(section, i))}</>;
}
