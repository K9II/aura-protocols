"use client";

import { useState } from "react";

// The storefront form field look (sign-in, sign-up, reset, finish account).
export const FIELD = "w-full border border-[color:var(--ink)] bg-[color:var(--paper)] px-3.5 py-3 text-sm";

// A password input with a Show / Hide text button inside the box — same
// behaviour as the gate's PasswordBox, storefront styling.
export default function PasswordField({ id, name = "password", autoComplete, minLength }: {
  id: string; name?: string; autoComplete: "current-password" | "new-password"; minLength?: number;
}) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative block mb-4">
      <input id={id} name={name} type={show ? "text" : "password"} autoComplete={autoComplete} minLength={minLength} required className={`${FIELD} pr-16`} />
      <button type="button" aria-controls={id} onClick={() => setShow((s) => !s)}
        className="s-micro absolute inset-y-0 right-0 px-3.5 bg-transparent border-0 cursor-pointer text-[color:var(--ink-soft)]">
        {show ? "Hide" : "Show"}
      </button>
    </span>
  );
}
