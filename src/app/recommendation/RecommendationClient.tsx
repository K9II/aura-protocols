"use client";
import { useState } from "react";
import RecommendationCard from "@/components/RecommendationCard";
import type { ProtocolOutput } from "@/lib/recommend/schema";

interface RecState { id: string; output: ProtocolOutput; }

export default function RecommendationClient({ initial }: { initial: RecState | null }) {
  const [rec, setRec] = useState<RecState | null>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true); setError(null);
    const res = await fetch("/api/recommend", { method: "POST" });
    setLoading(false);
    if (!res.ok) { setError(((await res.json().catch(() => ({}))) as { message?: string }).message ?? "Could not generate. Try again."); return; }
    const j = (await res.json()) as { id: string; output: ProtocolOutput };
    setRec({ id: j.id, output: j.output });
  }

  return (
    <div className="space-y-6">
      <button type="button" onClick={generate} disabled={loading}
        className="inline-flex items-center justify-center rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-900 hover:bg-cyan-300 disabled:opacity-50">
        {loading ? "Generating…" : rec ? "Regenerate" : "Generate my protocol"}
      </button>
      {error && <p className="text-sm text-red-300">{error}</p>}
      {rec && <RecommendationCard id={rec.id} output={rec.output} />}
    </div>
  );
}
