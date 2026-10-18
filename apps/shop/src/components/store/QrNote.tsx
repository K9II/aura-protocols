"use client";

import { useEffect, useState } from "react";
import { VIAL_QR_EVENT } from "@/components/store/VialTurn";

// The line under the product picture. It lights up while the turning vial holds on its QR code.
export default function QrNote({ slug }: { slug: string }) {
  const [lit, setLit] = useState(false);
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ slug: string; showing: boolean }>).detail;
      if (d?.slug === slug) setLit(d.showing);
    };
    window.addEventListener(VIAL_QR_EVENT, on);
    return () => window.removeEventListener(VIAL_QR_EVENT, on);
  }, [slug]);
  return (
    <p className={`s-micro s-pdp-qrnote${lit ? " is-lit" : ""}`}>
      <span aria-hidden>{lit ? "◆" : "◇"}</span> Every vial carries a QR code that opens its lot&apos;s certificate of analysis.
    </p>
  );
}
