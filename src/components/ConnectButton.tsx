"use client";
import { useState } from "react";

export default function ConnectButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/terra/connect", { method: "POST" });
    setLoading(false);
    if (!res.ok) { setError("Could not start the connect flow. Make sure you're signed in."); return; }
    const { url } = (await res.json()) as { url: string };
    window.location.href = url;
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={handleClick} disabled={loading}
        className="inline-flex items-center justify-center rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-900 hover:bg-cyan-300 disabled:opacity-50">
        {loading ? "Opening…" : "Connect a wearable"}
      </button>
      {error && <p className="text-sm text-red-300">{error}</p>}
    </div>
  );
}
