// The emails a thread sends. Pure. None of them repeats the customer's own
// words back (the compliance scan would block a question about use) — except
// the owner notification, which goes to the owner only.
import { escapeHtml as e } from "@/lib/html";
import { shell } from "@/lib/emails";
import { SUPPORT_EMAIL } from "@/lib/constants";
import { TOPIC_LABEL, type Topic } from "@/lib/inquiries/topics";
import { refLabel } from "@/lib/inquiries/rules";

const P = "font-size:15px;line-height:1.6";
const paras = (body: string) =>
  body.trim().split(/\n{2,}/).map((p) => `<p>${e(p).replace(/\n/g, "<br>")}</p>`).join("");

export function ackEmail(i: { ref: number; firstName: string; topic: Topic }) {
  const ref = refLabel(i.ref);
  return {
    subject: `We've got your message [${ref}]`,
    html: shell("We've got your message",
      `<p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#A32B1F">${ref} · ${e(TOPIC_LABEL[i.topic])}</p>
<p style="${P}">Hi ${e(i.firstName)} — thanks for writing. We'll reply to this address, usually within one business day.</p>
<p style="${P}">To add photos or more details, just reply to this email; it goes straight into the same conversation.</p>
<p style="${P}">— Aura Protocols</p>`),
    text: `${ref} · ${TOPIC_LABEL[i.topic]}\n\nHi ${i.firstName} — thanks for writing. We'll reply to this address, usually within one business day.\n\nTo add photos or more details, just reply to this email; it goes straight into the same conversation.\n\n— Aura Protocols\n${SUPPORT_EMAIL}`,
  };
}

// A volume-quote request sent from the order sheet: it's already an order (its
// page shows the progress), so this replaces the plain acknowledgement.
export function quoteRequestAckEmail(i: { ref: number; firstName: string; orderNumber: string; kits: number; replyHours: number; link: string }) {
  const ref = refLabel(i.ref);
  const kits = `${i.kits} kit${i.kits === 1 ? "" : "s"}`;
  return {
    subject: `Quote requested: order ${i.orderNumber} [${ref}]`,
    html: shell("Quote requested",
      `<p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#A32B1F">Order ${e(i.orderNumber)} · volume quote · ${ref}</p>
<p style="${P}">Hi ${e(i.firstName)} — thanks. We're pricing your ${e(kits)} now. Within ${i.replyHours} hours we'll email you, and your order page will show your price for each strength, the total and the deposit.</p>
<p style="${P}"><a href="${e(i.link)}" style="color:#A32B1F">Follow your order ${e(i.orderNumber)} →</a></p>
<p style="${P}">Nothing is charged until you pay the deposit. To change a strength or a kit count, just reply to this email.</p>
<p style="${P}">— Aura Protocols</p>`),
    text: `Order ${i.orderNumber} · volume quote · ${ref}\n\nHi ${i.firstName} — thanks. We're pricing your ${kits} now. Within ${i.replyHours} hours we'll email you, and your order page will show your price for each strength, the total and the deposit.\n\nFollow your order: ${i.link}\n\nNothing is charged until you pay the deposit. To change a strength or a kit count, just reply to this email.\n\n— Aura Protocols\n${SUPPORT_EMAIL}`,
  };
}

export function replyEmail(i: { ref: number; subject: string; body: string }) {
  const ref = refLabel(i.ref);
  const base = i.subject.replace(/^(re:\s*)+/i, "").replace(new RegExp(`\\s*\\[${ref}\\]`, "i"), "");
  return {
    subject: `Re: ${base} [${ref}]`,
    html: `<div style="font-family:Georgia,serif;color:#1C1A15;max-width:560px;${P}">${paras(i.body)}
<p style="font-size:12px;color:#4A4438;border-top:1px solid #C9C2AE;padding-top:12px;margin-top:24px">${ref} · Aura Protocols · All products are sold for laboratory research use only.<br>Reply to this email to answer.</p></div>`,
    text: `${i.body.trim()}\n\n--\n${ref} · Aura Protocols`,
  };
}

export function ownerNotifyEmail(i: {
  ref: number; topic: Topic; name: string; email: string; organization: string | null; orderNumber: string | null; message: string; link: string;
  quote?: { orderNumber: string; kits: number; replyHours: number; link: string };
}) {
  const ref = refLabel(i.ref);
  // CR/LF in the subject could inject extra email headers.
  const name = i.name.replace(/[\r\n]+/g, " ");
  if (i.quote) {
    const q = i.quote;
    return {
      subject: `Quote request ${q.orderNumber} · ${q.kits} kits — ${name} (price within ${q.replyHours} hours)`,
      html: shell(`Quote request ${q.orderNumber}`,
        `<p><b>${e(i.name)}</b> &lt;${e(i.email)}&gt;${i.organization ? ` — ${e(i.organization)}` : ""} asked for a volume quote: <b>${q.kits} kits</b>. We promised a price within ${q.replyHours} hours.</p>
<p>${e(i.message).replace(/\n/g, "<br>")}</p>
<p><a href="${e(q.link)}" style="color:#A32B1F">Price ${e(q.orderNumber)} in the admin →</a> · <a href="${e(i.link)}" style="color:#4A4438">conversation ${ref}</a></p>`),
    };
  }
  return {
    subject: `New inquiry ${ref} · ${TOPIC_LABEL[i.topic]} — ${name}`,
    html: shell(`New inquiry ${ref}`,
      `<p><b>${e(i.name)}</b> &lt;${e(i.email)}&gt;${i.organization ? ` — ${e(i.organization)}` : ""}${i.orderNumber ? ` · order ${e(i.orderNumber)}` : ""}</p>
<p>${e(i.message).replace(/\n/g, "<br>")}</p>
<p><a href="${e(i.link)}" style="color:#A32B1F">Open ${ref} in the admin →</a></p>`),
  };
}
