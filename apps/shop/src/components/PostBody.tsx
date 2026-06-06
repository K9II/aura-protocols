import Link from "next/link";
import type { Section, LinkPart } from "@/data/posts";
import { goUrl } from "@/lib/affiliate";

// Renders an array of post Sections in the dark site theme. Shared by the blog
// article renderer (/blog/[slug]) and the on-site reference page (/cheat-sheet)
// so the per-compound detail markup stays in one place.
export function renderSection(section: Section, i: number) {
  switch (section.type) {
    case "intro":
      return (
        <p key={i} className="text-lg text-slate-300 leading-relaxed border-l-2 border-cyan-400/40 pl-5 my-6">
          {section.text}
        </p>
      );
    case "h2":
      return (
        <h2 key={i} className="text-2xl font-bold text-white mt-10 mb-4">
          {section.text}
        </h2>
      );
    case "h3":
      return (
        <h3 key={i} className="text-lg font-bold text-cyan-300 mt-6 mb-2">
          {section.text}
        </h3>
      );
    case "p":
      return (
        <p key={i} className="text-slate-400 leading-relaxed my-4">
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
                      className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
                    >
                      {p.text}
                    </a>
                  );
                }
                return (
                  <Link
                    key={j}
                    href={p.href}
                    className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
                  >
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
            <li key={j} className="flex items-start gap-3 text-sm text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      );
    case "callout":
      return (
        <div key={i} className="bg-amber-400/5 border border-amber-400/20 rounded-xl p-5 my-6">
          <p className="text-sm text-amber-300 leading-relaxed">{section.text}</p>
        </div>
      );
    case "cta":
      return (
        <div key={i} className="glass p-6 my-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glow-cyan">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-1">Recommended Vendor</p>
            <p className="font-bold text-white">{section.vendor}</p>
            {section.productSlug && (
              <Link href={`/products/${section.productSlug}`} className="text-xs text-cyan-400 hover:underline mt-1 inline-block">
                View compound details →
              </Link>
            )}
          </div>
          <a
            href={section.vendor ? goUrl(section.vendor, section.productSlug) : section.affiliateUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="btn-primary text-sm py-2.5 px-6 whitespace-nowrap"
          >
            {section.text} →
          </a>
        </div>
      );
    case "disclaimer":
      return (
        <p key={i} className="text-xs text-slate-600 border-t border-white/5 pt-6 mt-8 leading-relaxed">
          {section.text}
        </p>
      );
    case "faq":
      return (
        <section key={i} className="my-10">
          <h2 className="text-2xl font-bold text-white mt-10 mb-4">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {section.faq?.map((item, j) => (
              <div key={j} className="glass p-5">
                <p className="font-semibold text-white mb-2">{item.q}</p>
                <p className="text-sm text-slate-400 leading-relaxed">{item.a}</p>
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
