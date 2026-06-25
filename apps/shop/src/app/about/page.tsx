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
        <p className="text-lg text-slate-300 font-medium">
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
          systemic inflammation trends. These are not abstract health metrics — they are the feedback loop that
          traditional wellness models ignore entirely.
        </p>
        <p className="text-white font-medium">Aura Protocols reads that loop.</p>
        <p>
          Our platform integrates with Oura, Whoop, Apple Watch, and Garmin, converting wearable telemetry into a
          structured research dashboard. The result: peptide protocols aligned not to a population average, but to the
          exact physiological state of your body, in real time.
        </p>

        {/* Stats bar */}
        <div className="glass p-6 grid grid-cols-2 sm:grid-cols-4 gap-6 my-8">
          {[
            { stat: "4", label: "Research categories" },
            { stat: "14", label: "Compounds reviewed" },
            { stat: "5", label: "Vetted vendors" },
            { stat: "0", label: "Sponsored rankings" },
          ].map(({ stat, label }) => (
            <div key={label} className="text-center">
              <p className="font-display text-2xl font-bold text-cyan-400">{stat}</p>
              <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">{label}</p>
            </div>
          ))}
        </div>

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
              "One-size protocols don't exist here. Your biomarker trends are the protocol.",
            ],
            [
              "Community of Excellence",
              "A vetted network of researchers and high-performers committed to measurable longevity.",
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
            ["Refine", "Analyze physiological shifts to continuously optimize recovery, cognition, and output."],
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
          We built Aura Protocols around that question. A platform that aggregates your biometric data and pairs it
          with structured research protocols — replacing assumption with signal, and guesswork with evidence.
        </p>

        <h2 className="text-xl font-bold text-white pt-2">Join the Evolution</h2>
        <p>
          Accelerated recovery. Enhanced neurological function. Metabolic precision. The data that drives each is
          already on your wrist.
        </p>
        <p className="font-semibold text-white">Welcome to Aura Protocols.</p>

        <p className="text-sm text-slate-500 border-t border-white/5 pt-6">
          All products referenced on this site are intended for research purposes only and are not intended to diagnose,
          treat, cure, or prevent any disease. Always consult a qualified healthcare professional before use.
        </p>
      </div>
    </div>
  );
}
