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

export function ownerNotifyEmail(i: { ref: number; topic: Topic; name: string; email: string; organization: string | null; orderNumber: string | null; message: string; link: string }) {
  const ref = refLabel(i.ref);
  // CR/LF in the subject could inject extra email headers.
  const name = i.name.replace(/[\r\n]+/g, " ");
  return {
    subject: `New inquiry ${ref} · ${TOPIC_LABEL[i.topic]} — ${name}`,
    html: shell(`New inquiry ${ref}`,
      `<p><b>${e(i.name)}</b> &lt;${e(i.email)}&gt;${i.organization ? ` — ${e(i.organization)}` : ""}${i.orderNumber ? ` · order ${e(i.orderNumber)}` : ""}</p>
<p>${e(i.message).replace(/\n/g, "<br>")}</p>
<p><a href="${e(i.link)}" style="color:#A32B1F">Open ${ref} in the admin →</a></p>`),
  };
}
