"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// /affiliates stays static, so whether the visitor is already a partner is asked
// in the browser. Partners get their dashboard; everyone else (and any failed
// check) gets Apply — /partners/apply sends a partner to the dashboard anyway.
export default function PartnerCta({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const [partner, setPartner] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/me/owner", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { partner: false }))
      .then((d: { partner?: boolean }) => { if (!cancelled) setPartner(d.partner === true); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  return partner
    ? <Link href="/partners" className={className} style={style}>Open your dashboard →</Link>
    : <Link href="/partners/apply" className={className} style={style}>Apply to partner →</Link>;
}
