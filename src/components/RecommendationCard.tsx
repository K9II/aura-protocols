import Disclaimer from "@/components/Disclaimer";
import PrescribeCTA from "@/components/PrescribeCTA";
import FeedbackWidget from "@/components/FeedbackWidget";
import type { ProtocolOutput } from "@/lib/recommend/schema";

export default function RecommendationCard({ id, output }: { id: string; output: ProtocolOutput }) {
  return (
    <article className="space-y-6 rounded-2xl border border-white/10 bg-slate-900/40 p-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-white">{output.headline}</h2>
        <p className="text-sm uppercase tracking-wider text-cyan-300">{output.template}</p>
      </header>
      <Disclaimer />
      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Protocol</h3>
        <ul className="mt-2 space-y-3">
          {output.steps.map((s, i) => (
            <li key={i} className="rounded-lg border border-white/10 p-3">
              <p className="font-medium text-white">{s.compound}</p>
              <p className="text-sm text-slate-300">{s.dose}</p>
              <p className="text-sm text-slate-400">Timing: {s.timing}</p>
              <p className="mt-1 text-sm text-slate-400">{s.rationale}</p>
            </li>
          ))}
        </ul>
      </section>
      {output.lifestyle.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Lifestyle</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-300">
            {output.lifestyle.map((l, i) => <li key={i}>{l}</li>)}
          </ul>
        </section>
      )}
      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Cycle</h3>
        <p className="mt-2 text-slate-300">{output.cycle}</p>
      </section>
      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Caveats</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-300">
          {output.caveats.map((c, i) => <li key={i}>{c}</li>)}
        </ul>
      </section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PrescribeCTA template={output.template} />
        <FeedbackWidget recommendationId={id} />
      </div>
    </article>
  );
}
