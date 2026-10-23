// Waitlist invite codes (pure). Six characters from an alphabet with no
// look-alikes (no 0/O, 1/I/L), so a code read aloud or retyped still works.
// Invite links use ?r= — partner links keep ?ref=.

export const REFERRAL_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const REFERRAL_CODE_LENGTH = 6;
export const REFERRAL_CREDIT_DOLLARS = 10;

const CODE_RE = new RegExp(`^[${REFERRAL_ALPHABET}]{${REFERRAL_CODE_LENGTH}}$`);

export function newReferralCode(randomBytes: (n: number) => Uint8Array): string {
  const bytes = randomBytes(REFERRAL_CODE_LENGTH);
  let code = "";
  for (const b of bytes) code += REFERRAL_ALPHABET[b % REFERRAL_ALPHABET.length];
  return code;
}

// A code typed or pasted by hand: trimmed and upper-cased. null when it isn't one.
export function parseReferralCode(raw: string | null | undefined): string | null {
  const code = (raw ?? "").trim().toUpperCase();
  return CODE_RE.test(code) ? code : null;
}

export function inviteUrl(site: string, code: string): string {
  return `${site}/?r=${code}`;
}

// The invite link as shown on the page and in the email: no scheme.
export function inviteLabel(site: string, code: string): string {
  return inviteUrl(site, code).replace(/^https?:\/\//, "");
}
