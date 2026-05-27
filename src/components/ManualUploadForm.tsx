"use client";
import { useState } from "react";
import { BiometricSnapshotSchema } from "@/lib/terra/schema";
import type { BiometricSnapshot } from "@/lib/terra/schema";

export default function ManualUploadForm({ onSubmit }: { onSubmit: (snapshot: BiometricSnapshot) => void }) {
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    setError(null);
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch {
      setError("Could not parse. Paste a JSON object with fields like recoveryScore, hrvMs, sleepHours.");
      return;
    }
    const result = BiometricSnapshotSchema.safeParse({ source: "MANUAL", ...(parsed as object) });
    if (!result.success) {
      setError("Could not parse. Some fields are out of range. See the example above.");
      return;
    }
    onSubmit(result.data);
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-slate-200" htmlFor="manual-paste">
        Paste your last 7 days of biometrics as JSON
      </label>
      <textarea
        id="manual-paste"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        className="h-48 w-full rounded-lg border border-white/10 bg-slate-900/60 p-3 font-mono text-sm text-slate-100"
        placeholder='{"capturedAt":"2026-05-23T07:00:00Z","recoveryScore":60,"hrvMs":50,"sleepHours":7}'
      />
      {error && <p className="text-sm text-red-300">{error}</p>}
      <button
        type="button"
        onClick={handleSubmit}
        className="inline-flex items-center justify-center rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-900 hover:bg-cyan-300"
      >
        Submit
      </button>
    </div>
  );
}
