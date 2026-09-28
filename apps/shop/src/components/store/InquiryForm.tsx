"use client";

import { useState } from "react";

export default function InquiryForm({
  kind,
  orgLabel,
  messageLabel,
}: {
  kind: "wholesale" | "affiliate";
  orgLabel: string;
  messageLabel: string;
}) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setState("sending");
    const res = await fetch("/api/inquiry", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind,
        name: f.get("name"),
        email: f.get("email"),
        organization: (f.get("organization") as string) || undefined,
        message: f.get("message"),
      }),
    }).catch(() => null);
    setState(res?.ok ? "sent" : "error");
  }

  if (state === "sent") {
    return (
      <p role="status" className="text-[color:var(--specimen)]">
        Thanks — we&apos;ll reply within two business days.
      </p>
    );
  }

  const field = "w-full border border-[color:var(--ink)] bg-[color:var(--paper)] px-3.5 py-3 text-sm mb-4";
  return (
    <form onSubmit={submit} className="max-w-xl">
      <label className="s-micro block mb-1.5" htmlFor="name">Name</label>
      <input id="name" name="name" required className={field} />
      <label className="s-micro block mb-1.5" htmlFor="email">Email</label>
      <input id="email" name="email" type="email" required className={field} />
      <label className="s-micro block mb-1.5" htmlFor="organization">{orgLabel}</label>
      <input id="organization" name="organization" className={field} />
      <label className="s-micro block mb-1.5" htmlFor="message">{messageLabel}</label>
      <textarea id="message" name="message" required rows={5} className={field} />
      <button type="submit" className="s-atc" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Send →"}
      </button>
      {state === "error" && (
        <p role="alert" className="mt-3 text-sm text-[color:var(--specimen)]">
          Could not send — please try again.
        </p>
      )}
    </form>
  );
}
