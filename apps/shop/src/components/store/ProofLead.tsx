"use client";

import { useEffect, useState } from "react";
import { VIAL_QR_EVENT } from "@/components/store/VialTurn";

// The dotted line from the vial's QR code to its certificate (LotProof): shown while the
// turning vial has its QR code facing out — each pause on it, then for good once it rests there.
export default function ProofLead({ slug }: { slug: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const f = (e: Event) => {
      const d = (e as CustomEvent<{ slug: string; showing: boolean }>).detail;
      if (d?.slug === slug) setOn(d.showing);
    };
    window.addEventListener(VIAL_QR_EVENT, f);
    return () => window.removeEventListener(VIAL_QR_EVENT, f);
  }, [slug]);
  return <span className={`s-proof-lead${on ? " is-on" : ""}`} aria-hidden />;
}
