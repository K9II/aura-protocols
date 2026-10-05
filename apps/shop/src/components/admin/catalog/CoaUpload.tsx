"use client";
// Certificate PDF: asks the server for a signed upload link (coaUploadAction),
// uploads from the browser straight to the public coa bucket (server actions
// cap bodies at 1 MB), then hands the stored path to the form.
import { useState } from "react";
import { coaUploadAction } from "@/app/admin/catalog/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { COA_MAX_BYTES } from "@/lib/catalog-ops/rules";

export default function CoaUpload({ lotNumber, path, onPath, error }: { lotNumber: string; path: string; onPath: (p: string) => void; error?: string }) {
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  async function pick(file: File | undefined) {
    if (!file) return;
    setMsg(null);
    if (file.type !== "application/pdf") return setMsg("PDF only.");
    if (file.size > COA_MAX_BYTES) return setMsg("Over 10 MB — export a smaller PDF.");
    setBusy(true);
    try {
      const link = await coaUploadAction(lotNumber);
      if ("error" in link) return setMsg(link.error);
      const { error: e } = await createSupabaseBrowserClient().storage.from("coa").uploadToSignedUrl(link.path, link.token, file, { contentType: "application/pdf" });
      if (e) return setMsg("Upload failed — try again.");
      setName(`${file.name} · ${Math.round(file.size / 1024)} KB`);
      onPath(link.path);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="a-fld">
      <label htmlFor="coa-file">Certificate (PDF)</label>
      <div className="a-file">
        <span className="pdf">PDF</span>
        <span><b>{name ?? (path ? path.split("/").pop() : "No file yet")}</b><small>{busy ? "Uploading…" : path ? "uploaded" : `up to ${COA_MAX_BYTES / 1024 / 1024} MB`}</small></span>
        <label className="a-btn sm r" htmlFor="coa-file">{path ? "Replace" : "Attach"}</label>
        <input id="coa-file" type="file" accept="application/pdf" hidden onChange={(e) => pick(e.target.files?.[0])} />
      </div>
      {(msg || error) && <div className="a-err" role="alert">{msg ?? error}</div>}
    </div>
  );
}
