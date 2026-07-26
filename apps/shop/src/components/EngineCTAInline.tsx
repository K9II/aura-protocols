import { ENGINE_URL, EXTERNAL_REL, ENGINE_CTA_COPY } from "@/lib/constants";

export default function EngineCTAInline() {
  return (
    <aside className="pharmacopoeia my-10 border border-[color:var(--specimen)]/30 bg-[color:var(--specimen)]/5 p-6">
      <h3 className="p-serif text-xl text-[color:var(--ink)]">
        {ENGINE_CTA_COPY.inlineHeading}
      </h3>
      <p className="mt-2 text-[color:var(--ink-soft)]">{ENGINE_CTA_COPY.inlineBody}</p>
      <a
        href={ENGINE_URL}
        target="_blank"
        rel={EXTERNAL_REL}
        className="p-btn-primary mt-4 inline-flex px-6 py-3 text-sm uppercase tracking-[0.06em]"
      >
        {ENGINE_CTA_COPY.inlineAction}
      </a>
    </aside>
  );
}
