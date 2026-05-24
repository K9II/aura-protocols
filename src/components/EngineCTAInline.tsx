import { ENGINE_URL, EXTERNAL_REL, ENGINE_CTA_COPY } from "@/lib/constants";

export default function EngineCTAInline() {
  return (
    <aside className="my-10 rounded-xl border border-cyan-400/30 bg-cyan-400/5 p-6">
      <h3 className="font-display text-xl font-bold text-white">
        {ENGINE_CTA_COPY.inlineHeading}
      </h3>
      <p className="mt-2 text-slate-300">{ENGINE_CTA_COPY.inlineBody}</p>
      <a
        href={ENGINE_URL}
        target="_blank"
        rel={EXTERNAL_REL}
        className="btn-primary mt-4 inline-flex"
      >
        {ENGINE_CTA_COPY.inlineAction}
      </a>
    </aside>
  );
}
