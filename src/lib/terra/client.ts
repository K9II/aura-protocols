import "server-only";
import crypto from "node:crypto";

const TERRA_BASE = "https://api.tryterra.co/v2";

export async function createTerraWidgetSession(params: {
  referenceId: string;
  providers: string[];
  successUrl: string;
  failureUrl: string;
}): Promise<{ url: string }> {
  const res = await fetch(`${TERRA_BASE}/auth/generateWidgetSession`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "dev-id": process.env.TERRA_DEV_ID!,
      "x-api-key": process.env.TERRA_API_KEY!,
    },
    body: JSON.stringify({
      reference_id: params.referenceId,
      providers: params.providers.join(","),
      auth_success_redirect_url: params.successUrl,
      auth_failure_redirect_url: params.failureUrl,
      language: "en",
    }),
  });
  if (!res.ok) {
    throw new Error(`Terra widget session failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { url: string };
  return { url: json.url };
}

export function verifyTerraSignature(rawBody: string, header: string | null): boolean {
  if (!header) return false;
  const secret = process.env.TERRA_SIGNING_SECRET;
  if (!secret) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = parts["t"];
  const v1 = parts["v1"];
  if (!t || !v1) return false;
  const signed = `${t}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secret).update(signed).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(v1, "hex"));
  } catch {
    return false;
  }
}
