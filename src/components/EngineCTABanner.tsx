"use client";
import { useEffect, useState } from "react";
import { ENGINE_URL, EXTERNAL_REL, ENGINE_CTA_COPY } from "@/lib/constants";

const KEY = "aura.engineBannerDismissed";

export default function EngineCTABanner() {
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && window.localStorage.getItem(KEY) === "1") {
      setDismissed(true);
    }
  }, []);
  if (dismissed) return null;
  return (
    <div className="sticky top-0 z-50 w-full bg-gradient-to-r from-cyan-500/20 via-violet-500/20 to-cyan-500/20 backdrop-blur border-b border-white/10">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 text-sm text-white">
        <p className="truncate">
          <span className="font-semibold text-cyan-300">New:</span> {ENGINE_CTA_COPY.banner}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href={ENGINE_URL}
            target="_blank"
            rel={EXTERNAL_REL}
            className="rounded-md bg-white/10 px-3 py-1 font-medium hover:bg-white/20"
          >
            {ENGINE_CTA_COPY.bannerAction}
          </a>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => {
              window.localStorage.setItem(KEY, "1");
              setDismissed(true);
            }}
            className="rounded-md px-2 py-1 text-white/60 hover:text-white"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
