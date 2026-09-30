import { escapeHtml as e, usd } from "@/lib/html";
import { shell } from "@/lib/emails";

export function partnerApplicationOwnerEmail(a: { code: string; name: string; typeLabel: string }) {
  return {
    subject: `New partner application — ${a.code}`,
    html: shell(`New partner application`, `<p>${e(a.name)} · ${e(a.typeLabel)} · requested code <b>${e(a.code)}</b>.</p><p>Review it on the Partners page.</p>`),
  };
}

export function partnerApprovedEmail(code: string, site: string) {
  const link = `${site}/?ref=${code.toLowerCase()}`;
  return {
    subject: `Your Aura partner code ${code} is active`,
    html: shell(`Welcome to the partner program`, `<p>Your code <b>${e(code)}</b> gives your audience 10% off, and your link counts for 60 days after a click:</p>
<p><a href="${e(link)}">${e(link)}</a></p>
<p>Two rules apply to every post: keep to research use only, and say you're a paid partner (for example "Paid partner of Aura Protocols" or "#ad"). The full rules are in the <a href="${e(site)}/partner-agreement">Partner Agreement</a>.</p>
<p>Your dashboard shows clicks, orders and earnings: <a href="${e(site)}/partners">${e(site)}/partners</a></p>`),
  };
}

export function partnerDeclinedEmail() {
  return {
    subject: "Your Aura partner application",
    html: shell(`About your application`, `<p>Thank you for applying. We aren't able to approve this application right now. You're welcome to apply again later if your channel or focus changes.</p>`),
  };
}

export function partnerCashPaidEmail(p: { cashCents: number; reference: string }) {
  return {
    subject: `Aura payout sent — ${usd(p.cashCents)}`,
    html: shell(`Payout sent`, `<p>We sent ${usd(p.cashCents)} to your payout account. Reference: ${e(p.reference)}.</p><p>Details are in your partner dashboard.</p>`),
  };
}

export function partnerCreditAddedEmail(p: { creditValueCents: number }) {
  return {
    subject: `Store credit added — ${usd(p.creditValueCents)}`,
    html: shell(`Store credit added`, `<p>${usd(p.creditValueCents)} of store credit (commission at 1.3×) is now on your account and applies automatically at checkout.</p>`),
  };
}

export function ownerPayoutRunEmail(runDate: string, rows: Array<{ code: string; cashCents: number; hint: string | null }>) {
  const total = rows.reduce((s, r) => s + r.cashCents, 0);
  const list = rows.map((r) => `<tr><td style="padding:4px 12px 4px 0">${e(r.code)}</td><td style="padding:4px 12px 4px 0">${e(r.hint ?? "no payout method on file")}</td><td style="text-align:right">${usd(r.cashCents)}</td></tr>`).join("");
  return {
    subject: `Payouts to send — ${runDate} — ${usd(total)}`,
    html: shell(`Payouts to send`, rows.length
      ? `<table style="border-collapse:collapse;font-size:14px">${list}</table><p>Send each amount, then mark it paid with its reference on the Payouts page.</p>`
      : `<p>No cash payouts this run. Store credit was added automatically.</p>`),
  };
}

export function ownerW9UploadedEmail(code: string) {
  return {
    subject: `W-9 uploaded by ${code} — please check it`,
    html: shell(`W-9 uploaded`, `<p>${e(code)} uploaded a W-9. Open it from the Payouts page and mark it checked to unlock cash payouts.</p>`),
  };
}
