// Health of the email system for the overview: rate tones, percent text and
// the hourly-run line. Pure.
import { RUN_STALE_HOURS, RUN_UNFINISHED_MINUTES } from "@/lib/email/constants";

export type Tone = "ok" | "amber" | "red";
export const rateTone = (p: number, warn: number, limit: number): Tone => (p >= limit ? "red" : p >= warn ? "amber" : "ok");
export const pct = (n: number, d: number): number => (d > 0 ? (n / d) * 100 : 0);

export function fmtPct(p: number): string {
  if (p === 0) return "0%";
  if (p < 0.1) return `${p.toFixed(2)}%`;
  if (p < 10) return `${p.toFixed(1)}%`;
  return `${Math.round(p)}%`;
}

export function ago(ms: number, nowMs: number = Date.now()): string {
  const m = Math.floor((nowMs - ms) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.floor(h / 24)} days ago`;
}

export type RunRow = {
  started_at: string; finished_at: string | null; welcome_sent: number; cart_sent: number; cart_skipped: number;
  campaign_sent: number; failures: number; error_text: string | null;
};

export function runDetail(r: RunRow): string {
  const total = r.welcome_sent + r.cart_sent + r.campaign_sent;
  const parts = [`${r.welcome_sent} welcome`, `${r.cart_sent} cart`, ...(r.campaign_sent ? [`${r.campaign_sent} campaign`] : [])];
  const skipped = r.cart_skipped ? ` · ${r.cart_skipped} reminder${r.cart_skipped === 1 ? "" : "s"} skipped (paused)` : "";
  return `sent ${total} · ${parts.join(", ")}${skipped} · ${r.failures} failure${r.failures === 1 ? "" : "s"}`;
}

export function runHealth(last: RunRow | null, nowMs: number = Date.now()): { tone: "ok" | "red"; title: string; detail: string } {
  if (!last) return { tone: "red", title: "No hourly email run recorded yet", detail: "Check the cron job in Vercel." };
  const started = Date.parse(last.started_at);
  const when = ago(started, nowMs);
  const detail = runDetail(last);
  if (nowMs - started > RUN_STALE_HOURS * 3_600_000) return { tone: "red", title: `Last run ${when} — the hourly email run may have stopped`, detail };
  if (!last.finished_at && nowMs - started > RUN_UNFINISHED_MINUTES * 60_000) return { tone: "red", title: `Last run ${when} didn't finish`, detail };
  return { tone: last.failures > 0 ? "red" : "ok", title: `Last run ${when}`, detail };
}
