"use client";
// The email exactly as it will render, in an isolated frame. Desktop/Phone toggle (mock screen 2).
import { useState } from "react";
import { campaignEmail, type RenderInput } from "@/lib/email/campaigns/render";
import { Icon } from "@/components/admin/ui";

export default function EmailPreview({ input, site, mailingAddress, fromName = "Alvester at Aura Protocols", startPhone = false }: { input: RenderInput; site: string; mailingAddress: string; fromName?: string; startPhone?: boolean }) {
  const [phone, setPhone] = useState(startPhone);
  const msg = campaignEmail(input, { site, unsubscribeUrl: `${site}/api/unsubscribe`, mailingAddress });
  const doc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>body{margin:0;padding:26px 30px;background:#fff}</style></head><body>${msg.html}</body></html>`;
  return (
    <div className="a-pv">
      <div className="a-pv-h"><span className="l">Preview</span>
        <div className="a-seg2" role="group" aria-label="Preview size">
          <button type="button" className={phone ? undefined : "on"} aria-pressed={!phone} onClick={() => setPhone(false)}><Icon name="desktop" />Desktop</button>
          <button type="button" className={phone ? "on" : undefined} aria-pressed={phone} onClick={() => setPhone(true)}>Phone</button>
        </div>
      </div>
      <div className="a-inbox"><b>{fromName}</b><span className="s">{msg.subject || "(no subject)"}</span>{input.previewText && <span className="pre">{input.previewText}</span>}</div>
      <iframe title="Email preview" className={`a-pv-frame${phone ? " phone" : ""}`} srcDoc={doc} sandbox="" />
    </div>
  );
}
