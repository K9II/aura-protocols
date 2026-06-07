interface Props {
  // Present when the user has a generated protocol.
  protocol: { templateLabel: string; topCompounds: string[] } | null;
  // True if the user has ANY biometric snapshot (drives the empty-state copy).
  hasData: boolean;
  // Distinct days of biometric data (1 row per day — migration 0004 makes
  // biometric_snapshots unique on user_id+metric_date, so count === days).
  dataDays: number;
}

export default function ProtocolSummaryCard({ protocol, hasData, dataDays }: Props) {
  // The engine generates from a single snapshot; trend deltas need ~8+ days.
  // Setting day-1 expectations keeps a thin first protocol from reading as broken.
  const dataNote = `Based on ${dataDays} day${dataDays === 1 ? "" : "s"} of data — accuracy improves as more syncs land.`;

  if (protocol) {
    return (
      <section className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">Latest protocol</p>
        <h2 className="mt-1 font-display text-2xl font-bold text-white">{protocol.templateLabel}</h2>
        {protocol.topCompounds.length > 0 && (
          <p className="mt-2 text-sm text-slate-300">{protocol.topCompounds.join(" · ")}</p>
        )}
        <p className="mt-2 text-xs text-slate-400">{dataNote}</p>
        <a href="/recommendation" className="mt-4 inline-flex rounded-lg bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-cyan-300">
          View full protocol →
        </a>
      </section>
    );
  }

  if (hasData) {
    return (
      <section className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">Latest protocol</p>
        <h2 className="mt-1 font-display text-2xl font-bold text-white">No protocol yet</h2>
        <p className="mt-2 text-sm text-slate-300">Your data is in. Generate a protocol tuned to it.</p>
        <p className="mt-2 text-xs text-slate-400">{dataNote}</p>
        <a href="/recommendation" className="mt-4 inline-flex rounded-lg bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-cyan-300">
          Generate your protocol →
        </a>
      </section>
    );
  }

  // No data at all — this card yields to a "get started" hero.
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 className="font-display text-2xl font-bold text-white">Get started</h2>
      <p className="mt-2 text-sm text-slate-300">Connect a wearable or upload a day of data to unlock your first protocol.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <a href="/connect" className="inline-flex rounded-lg bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-cyan-300">
          Connect a wearable →
        </a>
        <a href="/upload" className="inline-flex rounded-lg border border-white/15 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10">
          Upload data
        </a>
      </div>
    </section>
  );
}
