// Aura daily check. Reads ops.daily_check_summary() through the read-only
// daily_check login and emails the owner only when something needs attention
// (plus a Monday "all clear" so silence is never mistaken for a broken check).
// Runs from .github/workflows/daily-check.yml (GitHub Actions, 7:00 am Phoenix).
// The repo is public, so the log shows counts only — details go in the email.
// Env: DAILY_CHECK_DB_URL, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
//      SES_FROM_EMAIL, DAILY_CHECK_TO. Exit code 1 = the check itself failed.
import pg from "pg";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

const ADMIN = "https://auraprotocols.com/admin";
const env = (k) => { const v = process.env[k]; if (!v) throw new Error(`missing env ${k}`); return v; };
const usd = (c) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const day = (iso) => new Date(iso).toLocaleDateString("en-US", { timeZone: "America/Denver", month: "short", day: "numeric" });
const hoursAgo = (iso) => (Date.now() - Date.parse(iso)) / 3_600_000;

async function send(subject, lines) {
  const ses = new SESv2Client({ region: env("AWS_REGION") });
  const text = `${lines.join("\n")}\n\nOpen the command center: ${ADMIN}\n\n— Aura daily check (read-only; runs 7:00 am Mountain)`;
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const html = `<div style="font:14px/1.5 Georgia,serif;color:#1C1A15">${lines.map((l) => (l.startsWith("■") ? `<p style="margin:16px 0 4px;font-weight:bold">${esc(l.slice(2))}</p>` : `<div>${esc(l)}</div>`)).join("")}<p style="margin-top:20px"><a href="${ADMIN}">Open the command center</a></p><p style="color:#857D6C;font-size:12px">Aura daily check · read-only · runs 7:00 am Mountain</p></div>`;
  await ses.send(new SendEmailCommand({
    FromEmailAddress: `"Aura daily check" <${env("SES_FROM_EMAIL")}>`,
    Destination: { ToAddresses: [env("DAILY_CHECK_TO")] },
    Content: { Simple: { Subject: { Data: subject }, Body: { Text: { Data: text }, Html: { Data: html } } } },
  }));
}

function findings(s) {
  const out = []; // [section title, lines[]]
  const add = (title, lines) => { if (lines.length) out.push([title, lines]); };
  add("Alerts", s.alerts.map((a) => `${a.title}${a.count > 1 ? ` (×${a.count})` : ""} — ${a.detail}`));
  add("Disputes", [
    ...s.disputes_open.map((d) => `${d.order} chargeback (${d.reason.replace(/_/g, " ")}, ${usd(d.amount_cents)}) — respond by ${d.evidence_due_by ? day(d.evidence_due_by) : "?"}${d.draft_saved ? " · draft saved" : " · not started"}`),
    ...s.fraud_warnings_open.map((w) => `${w.order} early fraud warning (${w.fraud_type.replace(/_/g, " ")}) — order is ${w.order_status}${w.order_status === "paid" ? ": cancel and refund before shipping" : ""}`),
  ]);
  const late = s.orders_to_ship.filter((o) => o.business_days > s.ship_late_business_days);
  add("Orders to ship", s.orders_to_ship.length
    ? [`${s.orders_to_ship.length} paid order${s.orders_to_ship.length === 1 ? "" : "s"} waiting${late.length ? ` · ${late.length} late (over ${s.ship_late_business_days} business days): ${late.map((o) => o.order).join(", ")}` : ""}`]
    : []);
  const out0 = s.stock_low_or_out.filter((v) => v.available === 0);
  const low = s.stock_low_or_out.filter((v) => v.available > 0);
  add("Stock", [
    ...(out0.length ? [`Out of stock (${out0.length}): ${out0.map((v) => `${v.product} ${v.strength}`).join(", ")}`] : []),
    ...(low.length ? [`Low (${low.length}): ${low.map((v) => `${v.product} ${v.strength} — ${v.available} left`).join(", ")}`] : []),
  ]);
  add("Lots not live", s.lots_not_live.map((l) => `${l.lot} (${l.product} ${l.variant}) — ${l.has_certificate ? "certificate uploaded, needs the receiving check / Put live" : "needs its certificate"}`));
  const pay = [];
  const run = s.payout_run_latest;
  if (run && (!run.finished || run.error)) pay.push(`Payout run ${run.run_date} didn't finish${run.error ? `: ${run.error}` : ""}`);
  if (s.payouts_queued.count > 0) pay.push(`${s.payouts_queued.count} cash payout${s.payouts_queued.count === 1 ? "" : "s"} to send (${usd(s.payouts_queued.cash_cents)})`);
  if (s.w9s_awaiting_check > 0) pay.push(`${s.w9s_awaiting_check} W-9 waiting for your check`);
  if (s.partner_applications > 0) pay.push(`${s.partner_applications} partner application${s.partner_applications === 1 ? "" : "s"} waiting`);
  add("Partners and payouts", pay);
  if (s.inquiries_open.count > 0) add("Inquiries", [`${s.inquiries_open.count} need a reply · oldest waiting since ${day(s.inquiries_open.oldest_waiting_since)}`]);
  const mail = [];
  const er = s.email_run_latest;
  if (er && hoursAgo(er.started_at) < 24 * 7) {               // only once the hourly run is live
    if (hoursAgo(er.started_at) > 3) mail.push(`The hourly email run last ran ${Math.round(hoursAgo(er.started_at))} hours ago`);
    if (er.failures > 0 || er.error) mail.push(`Last email run had ${er.failures} failure(s)${er.error ? `: ${er.error}` : ""}`);
  }
  if (s.campaigns_stuck_sending > 0) mail.push(`A campaign has been "sending" for over 2 hours`);
  add("Email", mail);
  return out;
}

const pool = new pg.Client({ connectionString: env("DAILY_CHECK_DB_URL"), ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 20000, query_timeout: 20000 });
try {
  await pool.connect();
  const { rows } = await pool.query("select ops.daily_check_summary() as s");
  await pool.end();
  const f = findings(rows[0].s);
  const n = f.reduce((k, [, l]) => k + l.length, 0);
  const monday = new Date().toLocaleDateString("en-US", { timeZone: "America/Denver", weekday: "short" }) === "Mon";
  if (n === 0 && !monday) { console.log("RESULT: all clear — no email sent"); process.exit(0); }
  const lines = n === 0 ? ["All clear — nothing needs your attention today."] : f.flatMap(([t, l]) => [`■ ${t}`, ...l.map((x) => `• ${x}`)]);
  const subject = n === 0 ? "Aura daily check — all clear" : `Aura daily check — ${n} thing${n === 1 ? "" : "s"} need${n === 1 ? "s" : ""} attention`;
  await send(subject, lines);
  console.log(`RESULT: emailed — ${n} item(s): ${f.map(([t, l]) => `${t} ${l.length}`).join(", ") || "all clear"}`);
} catch (err) {
  console.error("CHECK FAILED:", err.code || err.name, String(err.message || "").replace(/postgres(ql)?:\/\/\S*/g, "<db-url>").slice(0, 200));
  try { await send("Aura daily check FAILED", [`The daily check couldn't run: ${err.message}`, "Nothing was checked today. Ask Claude to look at the routine's run log."]); } catch (e2) { console.error("and the failure email failed too:", e2.message); }
  process.exit(1);
}
