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
    <div className="p-card border border-[color:var(--line)] p-4">
      <p className="text-sm font-medium text-[color:var(--ink)]">Was this useful?</p>
      <div className="mt-2 flex gap-2">
        <button type="button" aria-label="Thumbs up" onClick={() => send("UP")} disabled={sent !== null}
          className="p-btn-outline px-3 py-1 text-sm">
          Thumbs up
        </button>
        <button type="button" aria-label="Thumbs down" onClick={() => send("DOWN")} disabled={sent !== null}
          className="p-btn-outline px-3 py-1 text-sm">
          Thumbs down
        </button>
      </div>
      <label className="mt-3 block text-xs text-[color:var(--ink-soft)]" htmlFor="feedback-comments">
        Comments (optional)
      </label>
      <textarea id="feedback-comments" value={freeText} onChange={(e) => setFreeText(e.target.value)}
        disabled={sent !== null} placeholder="Anything we got wrong?"
        className="mt-1 h-20 w-full border border-[color:var(--line)] bg-[color:var(--paper)] p-2 text-sm text-[color:var(--ink)] placeholder:text-[color:var(--ink-faint)] focus:border-[color:var(--specimen)] focus:outline-none" />
      {sent && <p className="mt-2 text-xs text-[color:var(--ink-soft)]">Thanks — recorded.</p>}
    </div>
  );
}
