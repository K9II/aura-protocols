import "server-only";
import { promises as dns } from "node:dns";
import { isDisposableEmailDomain } from "disposable-email-domains-js";

export type Deliverability = "ok" | "undeliverable" | "unknown";
type ResolveMx = (domain: string) => Promise<{ exchange: string; priority: number }[]>;

const NO_MAIL = new Set(["ENOTFOUND", "ENODATA", "ESERVFAIL", "EBADNAME"]);

// Sign-up check: an address must be able to receive mail. Disposable domains
// and domains without an MX record are refused; a DNS hiccup is "unknown"
// (the account is created but must verify before browsing).
export async function checkDeliverable(email: string, resolveMx: ResolveMx = dns.resolveMx): Promise<Deliverability> {
  const at = email.lastIndexOf("@");
  const domain = at > 0 ? email.slice(at + 1).trim().toLowerCase() : "";
  if (!domain || !domain.includes(".")) return "undeliverable";
  if (isDisposableEmailDomain(domain)) return "undeliverable";
  try {
    const mx = await resolveMx(domain);
    return mx.length > 0 ? "ok" : "undeliverable";
  } catch (err) {
    return NO_MAIL.has((err as { code?: string }).code ?? "") ? "undeliverable" : "unknown";
  }
}
