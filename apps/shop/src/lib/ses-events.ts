import "server-only";
import { createVerify } from "node:crypto";
import { accountIdByEmail, flagVerifyRequired } from "@/lib/account/data";
import { unsubscribe } from "@/lib/email/data";
import { normalizeEmail } from "@/lib/email/links";

export type SnsMessage = Record<string, string | undefined>;
type FetchCert = (url: string) => Promise<string>;

const CERT_HOST = /^sns\.[a-z0-9-]+\.amazonaws\.com$/;
const certCache = new Map<string, string>();

async function fetchCertDefault(url: string): Promise<string> {
  const cached = certCache.get(url);
  if (cached) return cached;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`SNS cert fetch failed: ${res.status}`);
  const pem = await res.text();
  certCache.set(url, pem);
  return pem;
}

// AWS SNS message signature (docs: "Verifying the signatures of Amazon SNS
// messages"): the signed string is "Key\nValue\n" for a fixed key list.
export async function verifySnsMessage(m: SnsMessage, fetchCert: FetchCert = fetchCertDefault): Promise<boolean> {
  try {
    const certUrl = new URL(m.SigningCertURL ?? "");
    if (certUrl.protocol !== "https:" || !CERT_HOST.test(certUrl.hostname) || !certUrl.pathname.endsWith(".pem")) return false;
    const keys = m.Type === "Notification"
      ? ["Message", "MessageId", ...(m.Subject ? ["Subject"] : []), "Timestamp", "TopicArn", "Type"]
      : ["Message", "MessageId", "SubscribeURL", "Timestamp", "Token", "TopicArn", "Type"];
    const text = keys.map((k) => `${k}\n${m[k] ?? ""}\n`).join("");
    const v = createVerify(m.SignatureVersion === "2" ? "RSA-SHA256" : "RSA-SHA1");
    v.update(text);
    return v.verify(await fetchCert(certUrl.toString()), m.Signature ?? "", "base64");
  } catch {
    return false;
  }
}

type Recipient = { emailAddress?: string };
type SesEvent = {
  notificationType?: string; eventType?: string;
  bounce?: { bounceType?: string; bouncedRecipients?: Recipient[] };
  complaint?: { complainedRecipients?: Recipient[] };
};

// Identity notifications use notificationType; configuration-set event
// publishing uses eventType — accept both.
export async function handleSesEvent(e: SesEvent): Promise<void> {
  const type = e.notificationType ?? e.eventType;
  if (type === "Bounce" && e.bounce?.bounceType === "Permanent") {
    for (const r of e.bounce.bouncedRecipients ?? []) {
      if (!r.emailAddress) continue;
      const email = normalizeEmail(r.emailAddress);
      const id = await accountIdByEmail(email);
      if (id) await flagVerifyRequired(id);
      await unsubscribe(email);
    }
  } else if (type === "Complaint") {
    for (const r of e.complaint?.complainedRecipients ?? []) {
      if (r.emailAddress) await unsubscribe(normalizeEmail(r.emailAddress));
    }
  }
}
