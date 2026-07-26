import { ENGINE_URL, EXTERNAL_REL, ENGINE_CTA_COPY } from "@/lib/constants";

export default function EngineCTACard() {
  return (
    <section className="pharmacopoeia mt-16 border border-[color:var(--line)] bg-[color:var(--paper-deep)] p-8">
      <h2 className="p-serif text-2xl text-[color:var(--ink)]">
        {ENGINE_CTA_COPY.cardHeading}
      </h2>
      <p className="mt-3 max-w-2xl text-[color:var(--ink-soft)]">{ENGINE_CTA_COPY.cardBody}</p>
      <a
        href={ENGINE_URL}
        target="_blank"
        rel={EXTERNAL_REL}
        className="p-btn-primary mt-5 inline-flex px-6 py-3 text-sm uppercase tracking-[0.06em]"
      >
        {ENGINE_CTA_COPY.cardAction}
      </a>
    </section>
  );
}
