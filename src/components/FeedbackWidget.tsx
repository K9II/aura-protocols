"use client";
import { useState } from "react";

export default function FeedbackWidget({ recommendationId }: { recommendationId: string }) {
  const [freeText, setFreeText] = useState("");
  const [sent, setSent] = useState<null | "UP" | "DOWN">(null);

  async function send(thumbs: "UP" | "DOWN") {
    setSent(thumbs);
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recommendationId, thumbs, freeText: freeText || undefined }),
    });
  }

  return (
    <div className="rounded-lg border border-white/10 bg-slate-900/40 p-4">
      <p className="text-sm font-medium text-slate-200">Was this useful?</p>
      <div className="mt-2 flex gap-2">
        <button type="button" aria-label="Thumbs up" onClick={() => send("UP")} disabled={sent !== null}
          className="rounded-md border border-white/10 px-3 py-1 text-slate-100 hover:bg-white/10">
          Thumbs up
        </button>
        <button type="button" aria-label="Thumbs down" onClick={() => send("DOWN")} disabled={sent !== null}
          className="rounded-md border border-white/10 px-3 py-1 text-slate-100 hover:bg-white/10">
          Thumbs down
        </button>
      </div>
      <label className="mt-3 block text-xs text-slate-400" htmlFor="feedback-comments">
        Comments (optional)
      </label>
      <textarea id="feedback-comments" value={freeText} onChange={(e) => setFreeText(e.target.value)}
        disabled={sent !== null} placeholder="Anything we got wrong?"
        className="mt-1 h-20 w-full rounded-md border border-white/10 bg-slate-900/60 p-2 text-sm text-slate-100" />
      {sent && <p className="mt-2 text-xs text-slate-400">Thanks — recorded.</p>}
    </div>
  );
}
