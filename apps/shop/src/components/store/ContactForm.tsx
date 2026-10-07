"use client";

import { useState } from "react";
import { TOPICS, TOPIC_LABEL, type Topic } from "@/lib/inquiries/topics";
import { INQUIRY_MESSAGE_MAX } from "@/lib/inquiries/constants";

type Props = { signedIn: { name: string; email: string } | null; orders: Array<{ number: string; label: string }> };
const field = "w-full border border-[color:var(--ink)] bg-[color:var(--paper)] px-3.5 py-3 text-sm mb-4";

export default function ContactForm({ signedIn, orders }: Props) {
  const [topic, setTopic] = useState<Topic>("order");
  const [state, setState] = useState<{ k: "idle" | "sending" } | { k: "sent"; ref: string | null } | { k: "error"; msg: string }>({ k: "idle" });

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const val = (k: string) => String(f.get(k) ?? "").trim();
    setState({ k: "sending" });
    const res = await fetch("/api/inquiry", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        topic,
        ...(signedIn ? {} : { name: val("name"), email: val("email") }),
        ...(val("orderNumber") ? { orderNumber: val("orderNumber") } : {}),
        message: val("message"),
        website: val("website"),
      }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok) setState({ k: "sent", ref: (data as { ref?: string | null }).ref ?? null });
    else setState({ k: "error", msg: (data as { error?: string }).error ?? "Could not send — please try again." });
  }

  if (state.k === "sent") {
    return (
      <div role="status" className="s-contact-sent">
        <p className="s-micro">Message sent</p>
        <p>Thanks — {state.ref ? <>your message is <b>{state.ref}</b>. </> : null}We&apos;ve emailed you a copy; reply to it any time to add photos or details.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="max-w-xl">
      {signedIn && (
        <div className="s-contact-who">
          <span>Signed in as <b>{signedIn.name}</b> · {signedIn.email}</span>
        </div>
      )}
      <fieldset className="mb-4">
        <legend className="s-micro block mb-1.5">Topic</legend>
        <div className="s-topics">
          {TOPICS.map((t) => (
            <label key={t} className={topic === t ? "on" : undefined}>
              <input type="radio" name="topic" value={t} checked={topic === t} onChange={() => setTopic(t)} />
              {TOPIC_LABEL[t]}
            </label>
          ))}
        </div>
      </fieldset>
      {!signedIn && (
        <>
          <label className="s-micro block mb-1.5" htmlFor="c-name">Name</label>
          <input id="c-name" name="name" required maxLength={120} className={field} />
          <label className="s-micro block mb-1.5" htmlFor="c-email">Email</label>
          <input id="c-email" name="email" type="email" required className={field} />
        </>
      )}
      {signedIn && orders.length > 0 ? (
        <>
          <label className="s-micro block mb-1.5" htmlFor="c-order">Order</label>
          <select id="c-order" name="orderNumber" className={field} defaultValue="">
            <option value="">No specific order</option>
            {orders.map((o) => <option key={o.number} value={o.number}>{o.label}</option>)}
          </select>
        </>
      ) : (
        <>
          <label className="s-micro block mb-1.5" htmlFor="c-order">Order number (optional)</label>
          <input id="c-order" name="orderNumber" maxLength={20} placeholder="AP-1052" className={field} />
        </>
      )}
      <label className="s-micro block mb-1.5" htmlFor="c-message">Message</label>
      <textarea id="c-message" name="message" required rows={6} maxLength={INQUIRY_MESSAGE_MAX} className={field} />
      <div className="s-hp" aria-hidden="true">
        <label htmlFor="c-website">Website</label>
        <input id="c-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <button type="submit" className="s-atc" disabled={state.k === "sending"}>{state.k === "sending" ? "Sending…" : "Send →"}</button>
      {state.k === "error" && <p role="alert" className="mt-3 text-sm text-[color:var(--specimen)]">{state.msg}</p>}
      <p className="mt-3 text-[13px] text-[color:var(--ink-soft)]">We can&apos;t advise on preparation or use — our compounds are for laboratory research use only.</p>
    </form>
  );
}
