import Link from "next/link";
import type { Section, LinkPart } from "@/data/posts";
import { catalogContent } from "@/data/catalog";

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
    case "cta": {
      // Retail-only: never render an outbound vendor link. Only a same-site
      // /products/<slug> link, and only when that compound exists in the
      // content catalog — otherwise render nothing. (Blog is unpublished; no prices.)
      const compound = section.productSlug ? catalogContent.find((c) => c.slug === section.productSlug) : undefined;
      if (!compound) return null;
      return (
        <div key={i} className="p-card p-6 my-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="font-semibold text-[color:var(--ink)]">{section.text}</p>
          <Link
            href={`/products/${compound.slug}`}
            className="p-btn-primary text-sm py-2.5 px-6 whitespace-nowrap"
          >
            View compound →
          </Link>
        </div>
      );
    }
    case "button":
      // Consecutive "button" sections render as adjacent array items with no
      // whitespace between them — mr-3 keeps them from touching when two or
      // more appear back to back (e.g. a comparison post linking every
      // product discussed), on top of the my-4 that spaces wrapped rows.
      // An external `href` (e.g. the Aura Engine) opens in a new tab; otherwise
      // fall back to an internal product-page link via productSlug.
      if (section.href) {
        return (
          <a
            key={i}
            href={section.href}
            target="_blank"
            rel="noopener noreferrer"
            className="p-btn-primary inline-block text-sm py-2.5 px-6 my-4 mr-3"
          >
            {section.text} →
          </a>
        );
      }
      return section.productSlug ? (
        <Link
          key={i}
          href={`/products/${section.productSlug}`}
          className="p-btn-primary inline-block text-sm py-2.5 px-6 my-4 mr-3"
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
