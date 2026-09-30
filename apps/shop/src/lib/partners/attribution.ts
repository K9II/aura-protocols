import "server-only";
import { getApprovedPartnerByCode } from "@/lib/partners/data";
import { validateCode } from "@/lib/partners/codes";
import { readRef } from "@/lib/partners/ref-cookie";

export type Attribution = { partnerId: string; code: string; via: "code" | "link" };

// Order-by-order: a code typed at checkout always wins; otherwise the most
// recent partner link clicked in the last 60 days. Partners never earn on
// their own orders.
export async function resolveAttribution(input: {
  typedCode?: string | null; refCookie?: string; buyerCustomerId: string;
}): Promise<{ attribution: Attribution | null; codeError?: string }> {
  const typed = input.typedCode?.trim();
  if (typed) {
    const check = validateCode(typed);
    const partner = check.ok ? await getApprovedPartnerByCode(check.code) : null;
    if (!partner) return { attribution: null, codeError: "This code can't be used." };
    if (partner.customer_id === input.buyerCustomerId) return { attribution: null, codeError: "You can't use your own partner code." };
    return { attribution: { partnerId: partner.id, code: partner.code, via: "code" } };
  }
  const refCode = readRef(input.refCookie);
  if (refCode) {
    const partner = await getApprovedPartnerByCode(refCode);
    if (partner && partner.customer_id !== input.buyerCustomerId) {
      return { attribution: { partnerId: partner.id, code: partner.code, via: "link" } };
    }
  }
  return { attribution: null };
}
