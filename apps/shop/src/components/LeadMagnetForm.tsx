"use client";

import { useState, type FormEvent } from "react";
import { LEAD_MAGNET_GOALS } from "@/lib/constants";

type Status = "idle" | "submitting" | "success" | "error";

// Reproduces the original Brevo signup form's copy, fonts, and layout verbatim,
// but on the site's own color scheme (Pharmacopoeia tokens) so the box matches
// the shop rather than Brevo's tan/blue-gray defaults. Fonts are forced inline
// to match Brevo exactly and intentionally override the site type system.
const FONT_HEADLINE = '"Comic Sans MS", "Comic Sans", cursive';
const FONT_SANS = "Helvetica, Arial, sans-serif";
const FONT_INPUT = "Roboto, Arial, sans-serif";

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

  const inputStyle: React.CSSProperties = {
    fontFamily: FONT_INPUT,
    fontSize: "16px",
    color: "var(--ink)",
    background: "#fff",
    border: "1px solid var(--line)",
    borderRadius: "2px",
    padding: "8px 12px",
    width: "100%",
    height: "40px",
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--paper)] p-2 text-left"
    >
      <div
        className="w-full rounded-[10px] px-5 py-7 sm:px-9 sm:py-9"
        style={{ backgroundColor: "var(--paper)" }}
      >
        {status === "success" ? (
          <div className="py-10 text-center">
            <p
              style={{ fontFamily: FONT_HEADLINE, fontSize: "26px", fontWeight: 700, color: "var(--ink)", lineHeight: 1.3 }}
            >
              Your subscription has been successful.
            </p>
            <p style={{ fontFamily: FONT_SANS, fontSize: "16px", color: "var(--ink-soft)", marginTop: "12px" }}>
              Your starting protocol is on its way to {email}.
            </p>
          </div>
        ) : (
          <>
            <h3
              style={{
                fontFamily: FONT_HEADLINE,
                fontSize: "32px",
                fontWeight: 700,
                color: "var(--ink)",
                lineHeight: "48px",
              }}
            >
              Get Your Researched Starting Protocol
            </h3>

            <p
              style={{
                fontFamily: FONT_SANS,
                fontSize: "16px",
                color: "var(--ink-soft)",
                lineHeight: "24px",
                marginTop: "16px",
              }}
            >
              Pick your #1 goal and we&apos;ll send a research-backed starting point - doses, timing, and COA-Verified Sources - to your inbox.
            </p>

            {/* Email row — label left, input right (Brevo horizontal layout) */}
            <div className="mt-6 sm:grid sm:grid-cols-[1fr_240px] sm:items-start sm:gap-5">
              <label
                htmlFor="lead-magnet-email"
                style={{ fontFamily: FONT_SANS, fontSize: "16px", fontWeight: 700, color: "var(--ink)", lineHeight: 1.25 }}
                className="block"
              >
                Enter your email address to subscribe
                <span style={{ color: "var(--specimen)" }}>*</span>
              </label>
              <input
                id="lead-magnet-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="EMAIL"
                style={inputStyle}
                className="mt-2 sm:mt-0"
              />
            </div>
            <p
              style={{ fontFamily: FONT_SANS, fontSize: "12px", color: "var(--ink-soft)", marginTop: "8px" }}
            >
              Provide your email address to subscribe. For e.g abc@xyz.com
            </p>

            {/* Goal row */}
            <div className="mt-5 sm:grid sm:grid-cols-[1fr_240px] sm:items-center sm:gap-5">
              <label
                htmlFor="lead-magnet-goal"
                style={{ fontFamily: FONT_SANS, fontSize: "16px", fontWeight: 700, color: "var(--ink)" }}
                className="block"
              >
                Goal<span style={{ color: "var(--specimen)" }}>*</span>
              </label>
              <select
                id="lead-magnet-goal"
                required
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                style={inputStyle}
                className="mt-2 sm:mt-0"
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
            </div>

            <button
              type="submit"
              disabled={status === "submitting"}
              style={{
                fontFamily: FONT_SANS,
                fontSize: "16px",
                fontWeight: 700,
                color: "#fff",
                background: "var(--specimen)",
                borderRadius: "3px",
                padding: "8px 18px",
                marginTop: "24px",
              }}
              className="inline-block disabled:opacity-60"
            >
              {status === "submitting" ? "SENDING…" : "SUBSCRIBE"}
            </button>

            {status === "error" && (
              <p style={{ fontFamily: FONT_SANS, fontSize: "14px", color: "var(--specimen)", marginTop: "12px" }}>
                Your subscription could not be saved. Please try again.
              </p>
            )}
          </>
        )}
      </div>
    </form>
  );
}
