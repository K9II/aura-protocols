import { describe, it, expect } from "vitest";
import { ago, fmtPct, pct, rateTone, runHealth } from "@/lib/email/health";
import { BOUNCE_LIMIT_PCT, BOUNCE_WARN_PCT, COMPLAINT_LIMIT_PCT, COMPLAINT_WARN_PCT } from "@/lib/email/constants";

const M = 60_000, H = 60 * M;
const run = (o: Partial<Parameters<typeof runHealth>[0] & object> = {}) => ({
  started_at: new Date(Date.parse("2026-10-05T17:00:00Z")).toISOString(), finished_at: "2026-10-05T17:01:00Z",
  welcome_sent: 4, cart_sent: 2, cart_skipped: 0, campaign_sent: 0, failures: 0, error_text: null, ...o,
});
const now = Date.parse("2026-10-05T17:14:00Z");

describe("email health", () => {
  it("tones rates against Amazon's limits", () => {
    expect(rateTone(0.6, BOUNCE_WARN_PCT, BOUNCE_LIMIT_PCT)).toBe("ok");
    expect(rateTone(2, BOUNCE_WARN_PCT, BOUNCE_LIMIT_PCT)).toBe("amber");
    expect(rateTone(5, BOUNCE_WARN_PCT, BOUNCE_LIMIT_PCT)).toBe("red");
    expect(rateTone(0.03, COMPLAINT_WARN_PCT, COMPLAINT_LIMIT_PCT)).toBe("ok");
    expect(rateTone(0.05, COMPLAINT_WARN_PCT, COMPLAINT_LIMIT_PCT)).toBe("amber");
    expect(rateTone(0.1, COMPLAINT_WARN_PCT, COMPLAINT_LIMIT_PCT)).toBe("red");
  });

  it("percent math and formatting", () => {
    expect(pct(41, 6842)).toBeCloseTo(0.599, 2);
    expect(pct(3, 0)).toBe(0);
    expect(fmtPct(0)).toBe("0%");
    expect(fmtPct(0.0292)).toBe("0.03%");
    expect(fmtPct(0.599)).toBe("0.6%");
    expect(fmtPct(12.4)).toBe("12%");
  });

  it("ago", () => {
    expect(ago(now - 14 * M, now)).toBe("14 min ago");
    expect(ago(now - 20 * 1000, now)).toBe("just now");
    expect(ago(now - 3 * H, now)).toBe("3 h ago");
    expect(ago(now - 50 * H, now)).toBe("2 days ago");
  });

  it("a healthy run", () => {
    expect(runHealth(run(), now)).toEqual({ tone: "ok", title: "Last run 14 min ago", detail: "sent 6 · 4 welcome, 2 cart · 0 failures" });
  });

  it("red when missing, stale, unfinished or failing", () => {
    expect(runHealth(null, now).tone).toBe("red");
    expect(runHealth(null, now).title).toBe("No hourly email run recorded yet");
    expect(runHealth(run({ started_at: new Date(now - 3 * H).toISOString() }), now)).toMatchObject({ tone: "red", title: "Last run 3 h ago — the hourly email run may have stopped" });
    expect(runHealth(run({ finished_at: null, started_at: new Date(now - 20 * M).toISOString() }), now)).toMatchObject({ tone: "red", title: "Last run 20 min ago didn't finish" });
    expect(runHealth(run({ failures: 2 }), now)).toMatchObject({ tone: "red", detail: "sent 6 · 4 welcome, 2 cart · 2 failures" });
  });

  it("mentions campaigns and skipped reminders when there are any", () => {
    expect(runHealth(run({ campaign_sent: 300, cart_skipped: 1 }), now).detail).toBe("sent 306 · 4 welcome, 2 cart, 300 campaign · 1 reminder skipped (paused) · 0 failures");
  });
});
