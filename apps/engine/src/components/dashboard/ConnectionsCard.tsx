export interface ConnectionItem {
  provider: string;
  connectedAt: string; // ISO timestamp
  revoked: boolean;
}

// Mirrors the provider check constraint in migration 0001 plus the "coming
// soon" mobile sources, so any stored provider id renders a friendly label.
const PROVIDER_LABELS: Record<string, string> = {
  WHOOP: "Whoop",
  OURA: "Oura",
  GARMIN: "Garmin",
  FITBIT: "Fitbit",
  DEXCOM: "Dexcom CGM",
  APPLE: "Apple Health",
  SAMSUNG: "Samsung Health",
  GOOGLE: "Google Fit",
  MANUAL: "Manual upload",
};

function label(provider: string): string {
  return PROVIDER_LABELS[provider] ?? provider;
}

export default function ConnectionsCard({ connections }: { connections: ConnectionItem[] }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 className="font-display text-xl font-bold text-white">Connections</h2>

      {connections.length === 0 ? (
        <p className="mt-2 text-sm text-slate-300">No sources connected yet. Connect a wearable or upload data to feed the Engine.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {connections.map((c, i) => (
            <li key={`${c.provider}-${i}`} className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-2.5">
              <span className="text-sm font-medium text-white">{label(c.provider)}</span>
              <span className="text-xs text-slate-400">
                {c.revoked ? "Revoked" : `Connected ${new Date(c.connectedAt).toLocaleDateString()}`}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <a href="/connect" className="inline-flex rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">
          Connect more
        </a>
        <a href="/upload" className="inline-flex rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">
          Upload data
        </a>
      </div>
    </section>
  );
}
