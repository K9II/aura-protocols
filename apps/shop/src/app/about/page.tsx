export const metadata = {
  title: "About — Aura Protocols",
  description: "Aura Protocols bridges advanced peptide research and real-time biometrics, giving high-performers the data infrastructure to move beyond guesswork.",
};

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <p className="text-xs uppercase tracking-widest text-cyan-400 font-semibold mb-2">About Aura Protocols</p>
      <h1 className="font-display text-4xl font-bold text-white mb-3">The Science of Synergy</h1>
      <p className="text-sm uppercase tracking-wider text-slate-500 mb-10">Where Biometrics Meet Bio-Harmonization</p>

      <div className="space-y-6 text-slate-400 leading-relaxed">

        <h2 className="text-xl font-bold text-white pt-2">Our Story</h2>
        <p>Aura Protocols was not built in a boardroom. It was built from a problem.</p>
        <p>
          Our founders — biohackers, data engineers, and longevity researchers — watched a pattern repeat itself across
          the peptide research community: sophisticated protocols, expensive compounds, zero feedback mechanism.
          Researchers were timing everything on intuition. Recovery impacts went unmeasured. There was no objective
          signal telling anyone whether anything was working.
        </p>
        <p>The question we asked was simple: what if your wearable already had the answer?</p>
        <p>
          We built Aura Protocols around that question — a platform that aggregates your biometric data and pairs it
          with structured research protocols, replacing assumption with signal and guesswork with evidence.
        </p>

        <p className="text-lg text-slate-300 font-medium pt-2">
          Generalized wellness is a guess. Aura Protocols is not.
        </p>
        <p>
          We exist at the intersection of advanced peptide research and real-time human biometrics — built for the
          researcher, the high-performer, and the individual who refuses to operate on assumption. Your body is already
          generating precise physiological data every hour of every day. We built the infrastructure to use it.
        </p>

        <h2 className="text-xl font-bold text-white pt-2">Driven by Data. Optimized for Life.</h2>
        <p>
          Every human system communicates in signals: heart rate variability, sleep architecture, metabolic output,
          systemic inflammation trends. These are not abstract metrics — they are the feedback loop that traditional
          wellness models ignore entirely.
        </p>
        <p className="text-white font-medium">Aura Protocols reads that loop.</p>
        <p>
          Our platform integrates with Oura, Whoop, Apple Watch, and Garmin, converting wearable telemetry into a
          structured research dashboard. The result: research protocols correlated to your own physiological
          baseline — not a population average.
        </p>

        <h2 className="text-xl font-bold text-white pt-2">Core Pillars</h2>

        <div className="glass p-8 space-y-5">
          {[
            [
              "Rigorous Research",
              "We synthesize peer-reviewed peptide data into a structured, navigable research library built to academic standards.",
            ],
            [
              "Device-Agnostic Integration",
              "Oura, Whoop, Garmin, Apple Watch. We read your hardware; you read your results.",
            ],
            [
              "Hyper-Individualization",
              "One-size protocols don't exist here. Your biomarker data drives the research framework.",
            ],
            [
              "Community of Excellence",
              "A vetted network of researchers and high-performers committed to long-term performance optimization.",
            ],
          ].map(([title, desc]) => (
            <div key={title} className="flex gap-4">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 flex-shrink-0" />
              <div>
                <p className="font-semibold text-white">{title}</p>
                <p className="text-sm text-slate-400">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 className="text-xl font-bold text-white pt-2">The Peak Performance Loop</h2>

        <div className="glass p-8 space-y-5">
          {[
            ["Quantify", "Establish baseline vitals through your biometric device of choice."],
            ["Research", "Access our curated database of cellular peptide compounds."],
            ["Align", "Correlate research timing with your circadian and metabolic data."],
            ["Refine", "Track physiological shifts to analyze how your body responds across recovery, cognitive clarity, and output metrics over time."],
          ].map(([title, desc], i) => (
            <div key={title} className="flex gap-4">
              <span className="font-display text-sm font-bold text-cyan-400 mt-0.5 w-5 flex-shrink-0">
                {i + 1}.
              </span>
              <div>
                <p className="font-semibold text-white">{title}</p>
                <p className="text-sm text-slate-400">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 className="text-xl font-bold text-white pt-2">Join the Evolution</h2>
        <p>
          Recovery. Cognitive clarity. Metabolic performance. Whether your research focus spans tissue repair,
          neurological study, or metabolic tracking — the feedback mechanism now exists.
        </p>
        <p>Your data is the compass. Aura Protocols is the map.</p>
        <p className="font-semibold text-white">Welcome to Aura Protocols.</p>

        <p className="text-sm text-slate-500 border-t border-white/5 pt-6">
          All products referenced on this site are intended for in vitro research purposes only and are not intended
          to diagnose, treat, cure, or prevent any disease. Nothing on this site constitutes medical advice. Always
          consult a qualified healthcare professional before use.
        </p>
      </div>
    </div>
  );
}
