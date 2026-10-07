"use client";

import { useEffect, useRef, useState } from "react";
import { HUMAN_CHECK_ACTION, TURNSTILE_SCRIPT } from "@/lib/human-check";

type Turnstile = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global { interface Window { turnstile?: Turnstile } }

const COMPACT_BELOW_PX = 360;

// Cloudflare Turnstile, rendered explicitly. onToken gets the token when the
// visitor passes and null when it expires or is reset. Each token works once,
// so the form bumps resetKey after every attempt that doesn't leave the page.
export default function HumanCheck({ onToken, resetKey }: { onToken: (token: string | null) => void; resetKey: number }) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const tokenCb = useRef(onToken);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => { tokenCb.current = onToken; }, [onToken]);

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;
    const mount = () => {
      if (cancelled || !box.current || !window.turnstile || widget.current) return;
      widget.current = window.turnstile.render(box.current, {
        sitekey: siteKey, action: HUMAN_CHECK_ACTION, "refresh-expired": "auto", theme: "light",
        // The normal widget is a fixed 300 px; the smallest phones get the compact one.
        size: window.matchMedia?.(`(max-width: ${COMPACT_BELOW_PX - 1}px)`).matches ? "compact" : "normal",
        callback: (t: string) => tokenCb.current(t),
        "expired-callback": () => tokenCb.current(null),
        "error-callback": () => tokenCb.current(null),
      });
    };
    const failed = () => { if (!cancelled) setLoadFailed(true); };
    let script: HTMLScriptElement | null = null;
    if (window.turnstile) mount();
    else {
      script = document.querySelector<HTMLScriptElement>(`script[src="${TURNSTILE_SCRIPT}"]`);
      if (!script) {
        script = document.createElement("script");
        script.src = TURNSTILE_SCRIPT; script.async = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", mount);
      script.addEventListener("error", failed);
    }
    return () => {
      cancelled = true;
      script?.removeEventListener("load", mount);
      script?.removeEventListener("error", failed);
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current);
      widget.current = null;
    };
  }, [siteKey]);

  useEffect(() => {
    if (resetKey === 0 || !widget.current || !window.turnstile) return;
    tokenCb.current(null);
    window.turnstile.reset(widget.current);
  }, [resetKey]);

  if (!siteKey || loadFailed) {
    return <p role="alert" className="text-sm text-[color:var(--specimen)]">The check couldn&apos;t load — please refresh the page. If it keeps happening, contact us.</p>;
  }
  return <div ref={box} className="s-human-widget" />;
}
