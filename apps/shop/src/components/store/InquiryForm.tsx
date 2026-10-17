"use client";

import { useEffect, useRef, useState } from "react";
import type { Topic } from "@/lib/inquiries/topics";

type QuoteLineIn = { slug: string; variantId: string; kits: number };
const norm = (t: string) => t.replace(/\r\n/g, "\n").trim();

export default function InquiryForm({
  topic,
  orgLabel,
  messageLabel,
  prefillEvent,
  messagePlaceholder,
  signedIn,
}: {
  topic: Topic;
  orgLabel: string;
  messageLabel: string;
  // A window event that fills the message, e.g. the wholesale order sheet's "Ask for a volume
  // quote": detail is the text, or { message, lines } with the kits it was written from. The
  // buyer can still edit it before sending; nothing sends by itself.
  prefillEvent?: string;
  messagePlaceholder?: string;
  // Signed in: name and email come from the account (the API uses the account's anyway, like
  // /contact), and the organization starts from the account's.
  signedIn?: { name: string; email: string; organization: string | null } | null;
}) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const message = useRef<HTMLTextAreaElement>(null);
  // The kits behind a filled-in volume-quote request. Sent with the message only if it
  // wasn't edited: then the request becomes an order and the buyer goes to its page.
  const handed = useRef<{ message: string; lines: QuoteLineIn[] } | null>(null);

  useEffect(() => {
    if (!prefillEvent) return;
    const fill = (e: Event) => {
      const d = (e as CustomEvent<unknown>).detail;
      const text = typeof d === "string" ? d : d && typeof d === "object" && typeof (d as { message?: unknown }).message === "string" ? (d as { message: string }).message : null;
      if (text == null || !message.current) return;
      const lines = typeof d === "object" && d && Array.isArray((d as { lines?: unknown }).lines) ? (d as { lines: QuoteLineIn[] }).lines : null;
      handed.current = lines ? { message: text, lines } : null;
      message.current.value = text;
      message.current.focus({ preventScroll: true });
    };
    window.addEventListener(prefillEvent, fill);
    return () => window.removeEventListener(prefillEvent, fill);
  }, [prefillEvent]);
  const [ref, setRef] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const text = String(f.get("message") ?? "");
    const h = handed.current;
    const quoteLines = h && norm(h.message) === norm(text) ? h.lines : undefined;
    setState("sending");
    const res = await fetch("/api/inquiry", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        topic,
        ...(signedIn ? {} : { name: f.get("name"), email: f.get("email") }),
        organization: (f.get("organization") as string) || undefined,
        message: text,
        website: f.get("website"),
        ...(quoteLines ? { quoteLines } : {}),
      }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok) {
      const d = data as { ref?: string | null; orderNumber?: string | null };
      // A volume-quote request became an order: its page is where the buyer follows it.
      if (d.orderNumber) { window.location.assign(`/order/${encodeURIComponent(d.orderNumber)}`); return; }
      setRef(d.ref ?? null);
      setState("sent");
    } else {
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <p role="status" className="text-[color:var(--specimen)]">
        Thanks — {ref ? <>your message is <b>{ref}</b>. </> : null}We&apos;ve emailed you a copy; we usually reply within one business day.
      </p>
    );
  }

  const field = "w-full border border-[color:var(--ink)] bg-[color:var(--paper)] px-3.5 py-3 text-sm mb-4";
  return (
    <form onSubmit={submit} className="max-w-xl">
      {signedIn ? (
        <div className="s-contact-who">
          <span>Signed in as <b>{signedIn.name}</b> · {signedIn.email}</span>
        </div>
      ) : (
        <>
          <label className="s-micro block mb-1.5" htmlFor="name">Name</label>
          <input id="name" name="name" required className={field} />
          <label className="s-micro block mb-1.5" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required className={field} />
        </>
      )}
      <label className="s-micro block mb-1.5" htmlFor="organization">{orgLabel}</label>
      <input id="organization" name="organization" defaultValue={signedIn?.organization ?? ""} className={field} />
      <label className="s-micro block mb-1.5" htmlFor="message">{messageLabel}</label>
      <textarea id="message" name="message" required rows={5} className={field} ref={message} placeholder={messagePlaceholder} />
      <div className="s-hp" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
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
