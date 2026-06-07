"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ManualUploadForm from "@/components/ManualUploadForm";
import type { BiometricSnapshot } from "@/lib/terra/schema";

export default function UploadClient() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(snap: BiometricSnapshot) {
    setStatus("sending");
    const res = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(snap) });
    if (!res.ok) { setStatus("error"); setErrorMsg("Could not save your data. Try again."); return; }
    router.push("/dashboard");
  }

  return (
    <>
      <ManualUploadForm onSubmit={handleSubmit} />
      {status === "sending" && <p className="mt-3 text-sm text-slate-400">Saving…</p>}
      {status === "error" && errorMsg && <p className="mt-3 text-sm text-red-300">{errorMsg}</p>}
    </>
  );
}
