"use client";

import { useEffect, useRef } from "react";
import { LEAD_MAGNET } from "@/lib/constants";

export default function EmailCapture() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (LEAD_MAGNET.beehiivFormId === "PLACEHOLDER_FORM_ID") return;
    const node = containerRef.current;
    if (!node || node.querySelector("script[data-beehiiv-form]")) return;
    const script = document.createElement("script");
    script.async = true;
    script.src = LEAD_MAGNET.beehiivLoaderSrc;
    script.setAttribute("data-beehiiv-form", LEAD_MAGNET.beehiivFormId);
    node.appendChild(script);
  }, []);

  if (LEAD_MAGNET.beehiivPublicationId === "PLACEHOLDER_PUB_ID") return null;

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0d1117] px-2 py-5 text-center sm:p-8">
      <div ref={containerRef} className="beehiiv-center" />
    </section>
  );
}
