"use client";
import { useState } from "react";
import { Icon } from "@/components/admin/ui";

export default function CopyAll({ codes, label = "Copy all", className = "a-btn sm" }: { codes: string[]; label?: string; className?: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setState("done");
    } catch {
      setState("failed"); // clipboard blocked: say so rather than pretend
    }
    setTimeout(() => setState("idle"), 1500);
  };
  return (
    <button type="button" className={className} onClick={copy} aria-live="polite">
      <Icon name={state === "done" ? "check" : state === "failed" ? "warn" : "copy"} />
      {state === "done" ? "Copied" : state === "failed" ? "Copy failed" : label}
    </button>
  );
}
