import { ENGINE_URL, EXTERNAL_REL, ENGINE_CTA_COPY } from "@/lib/constants";

export default function EngineCTACard() {
  return (
    <section className="mt-16 rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/10 to-violet-500/10 p-8">
      <h2 className="font-display text-2xl font-bold text-white">
        {ENGINE_CTA_COPY.cardHeading}
      </h2>
      <p className="mt-3 max-w-2xl text-slate-300">{ENGINE_CTA_COPY.cardBody}</p>
      <a
        href={ENGINE_URL}
        target="_blank"
        rel={EXTERNAL_REL}
        className="btn-primary mt-5 inline-flex"
      >
        {ENGINE_CTA_COPY.cardAction}
      </a>
    </section>
  );
}
