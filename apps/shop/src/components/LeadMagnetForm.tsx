"use client";

import { useState, type FormEvent } from "react";
import { LEAD_MAGNET_GOALS } from "@/lib/constants";

type Status = "idle" | "submitting" | "success" | "error";

export default function LeadMagnetForm() {
  const [email, setEmail] = useState("");
  const [goal, setGoal] = useState<string>("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, goal }),
      });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--paper)] p-8 text-center">
        <p className="p-serif text-xl text-[color:var(--ink)]">Check your inbox</p>
        <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
          Your starting protocol is on its way to {email}.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--paper)] px-2 py-5 text-left sm:p-8"
    >
      <label htmlFor="lead-magnet-email" className="block text-sm font-semibold text-[color:var(--ink)]">
        Email address
      </label>
      <input
        id="lead-magnet-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="mt-1 w-full rounded-md border border-[color:var(--line)] bg-white px-3 py-2 text-[color:var(--ink)]"
        placeholder="you@example.com"
      />

      <label htmlFor="lead-magnet-goal" className="mt-4 block text-sm font-semibold text-[color:var(--ink)]">
        Goal
      </label>
      <select
        id="lead-magnet-goal"
        required
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        className="mt-1 w-full rounded-md border border-[color:var(--line)] bg-white px-3 py-2 text-[color:var(--ink)]"
      >
        <option value="" disabled>
          Select one
        </option>
        {LEAD_MAGNET_GOALS.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>

      <button
        type="submit"
        disabled={status === "submitting"}
        className="mt-5 w-full rounded-md bg-[color:var(--specimen)] px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-white disabled:opacity-60"
      >
        {status === "submitting" ? "Sending…" : "Subscribe"}
      </button>

      {status === "error" && (
        <p className="mt-3 text-sm text-[color:var(--specimen)]">
          Something went wrong — please try again.
        </p>
      )}
    </form>
  );
}
