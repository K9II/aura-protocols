import { DISCLAIMER } from "@/lib/constants";

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
      <section className="p-card border border-[color:var(--line)] p-6">
        <p className="p-cat-label">Latest protocol</p>
        <h2 className="mt-1 p-serif text-2xl">{protocol.templateLabel}</h2>
        {protocol.topCompounds.length > 0 && (
          <p className="mt-2 text-sm text-[color:var(--ink-soft)]">{protocol.topCompounds.join(" · ")}</p>
        )}
        <p className="mt-2 text-xs text-[color:var(--ink-faint)]">{dataNote}</p>
        <a href="/recommendation" className="p-btn-primary mt-4 inline-flex px-5 py-2.5 text-sm font-semibold">
          View full protocol →
        </a>
        <p className="mt-3 text-xs italic text-[color:var(--ink-faint)]">{DISCLAIMER}</p>
      </section>
    );
  }

  if (hasData) {
    return (
      <section className="p-card border border-[color:var(--line)] p-6">
        <p className="p-cat-label">Latest protocol</p>
        <h2 className="mt-1 p-serif text-2xl">No protocol yet</h2>
        <p className="mt-2 text-sm text-[color:var(--ink-soft)]">Your data is in. Generate a protocol tuned to it.</p>
        <p className="mt-2 text-xs text-[color:var(--ink-faint)]">{dataNote}</p>
        <a href="/recommendation" className="p-btn-primary mt-4 inline-flex px-5 py-2.5 text-sm font-semibold">
          Generate your protocol →
        </a>
        <p className="mt-3 text-xs italic text-[color:var(--ink-faint)]">{DISCLAIMER}</p>
      </section>
    );
  }

  // No data at all — this card yields to a "get started" hero.
  return (
    <section className="p-card border border-[color:var(--line)] p-6">
      <h2 className="p-serif text-2xl">Get started</h2>
      <p className="mt-2 text-sm text-[color:var(--ink-soft)]">Connect a wearable or upload a day of data to unlock your first protocol.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <a href="/connect" className="p-btn-primary inline-flex px-5 py-2.5 text-sm font-semibold">
          Connect a wearable →
        </a>
        <a href="/upload" className="p-btn-outline inline-flex px-5 py-2.5 text-sm font-semibold">
          Upload data
        </a>
      </div>
    </section>
  );
}
