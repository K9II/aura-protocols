export interface ConnectionItem {
  provider: string;
  connectedAt: string; // ISO timestamp
  revoked: boolean;
}

// Mirrors the provider check constraint in migration 0001 plus the "coming
// soon" mobile sources, so any stored provider id renders a friendly label.
const PROVIDER_LABELS: Record<string, string> = {
  HUME: "Hume",
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
    <section className="p-card border border-[color:var(--line)] p-6">
      <h2 className="p-serif text-xl">Connections</h2>

      {connections.length === 0 ? (
        <p className="mt-2 text-sm text-[color:var(--ink-soft)]">No sources connected yet. Connect a wearable or upload data to feed the Engine.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {connections.map((c, i) => (
            <li key={`${c.provider}-${i}`} className="flex items-center justify-between bg-[color:var(--paper-deep)] px-4 py-2.5">
              <span className="text-sm font-medium text-[color:var(--ink)]">{label(c.provider)}</span>
              <span className="text-xs text-[color:var(--ink-soft)]">
                {c.revoked ? "Revoked" : <span className="text-[color:var(--sig-ok)]">{`Connected ${new Date(c.connectedAt).toLocaleDateString()}`}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <span className="inline-flex cursor-not-allowed border border-[color:var(--line)] px-4 py-2 text-sm font-semibold text-[color:var(--ink-faint)]" title="Coming soon">
          Connect wearable (coming soon)
        </span>
        <a href="/upload" className="p-btn-outline inline-flex px-4 py-2 text-sm font-semibold">
          Upload data
        </a>
      </div>
    </section>
  );
}
