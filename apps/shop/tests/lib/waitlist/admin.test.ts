import { describe, it, expect } from "vitest";
import {
  cleanWaitlistSearch, csvCell, searchWaitlist, shapeWaitlist, topReferrers, waitlistCounts, waitlistCsv,
  type WaitlistDbRow,
} from "@/lib/waitlist/admin";

const SITE = "https://auraprotocols.com";
// 2026-10-23 10:00 Mountain (MDT, UTC-6).
const NOW = Date.parse("2026-10-23T16:00:00Z");

const db: WaitlistDbRow[] = [
  { email: "a@x.com", status: "confirmed", waitlist_at: "2026-10-10T15:00:00Z", referral_code: "AAAAAA", referred_by: null },
  { email: "b@x.com", status: "confirmed", waitlist_at: "2026-10-20T15:00:00Z", referral_code: "BBBBBB", referred_by: "AAAAAA" },
  { email: "c@x.com", status: "unsubscribed", waitlist_at: "2026-10-23T15:00:00Z", referral_code: "CCCCCC", referred_by: "AAAAAA" },
  { email: "d@x.com", status: "pending", waitlist_at: "2026-10-23T05:00:00Z", referral_code: null, referred_by: "BBBBBB" },
  { email: "e@x.com", status: "confirmed", waitlist_at: "2026-10-16T15:00:00Z", referral_code: "EEEEEE", referred_by: "ZZZZZZ" },
];
const rows = shapeWaitlist(db, SITE);

describe("waitlist admin", () => {
  it("sorts newest first and fills in who brought whom", () => {
    expect(rows.map((r) => r.email)).toEqual(["c@x.com", "d@x.com", "b@x.com", "e@x.com", "a@x.com"]);
    const a = rows.find((r) => r.email === "a@x.com")!;
    expect(a.colleagues).toBe(2);
    expect(a.inviteLabel).toBe("auraprotocols.com/?r=AAAAAA");
    expect(rows.find((r) => r.email === "d@x.com")!).toMatchObject({ referrerEmail: "b@x.com", colleagues: 0, inviteLabel: null });
    // A code that isn't on the list shows no referrer.
    expect(rows.find((r) => r.email === "e@x.com")!.referrerEmail).toBeNull();
  });

  it("counts in shop time: today, the last 7 days, invites, unsubscribed", () => {
    // d joined 05:00Z = Oct 22 11 pm Mountain — yesterday, not today. e (Oct 16) is outside the 7 days.
    expect(waitlistCounts(rows, NOW)).toEqual({ onList: 4, today: 1, week: 3, invited: 3, unsubscribed: 1 });
  });

  it("ranks referrers by colleagues, then who joined first", () => {
    expect(topReferrers(rows).map((r) => [r.email, r.colleagues])).toEqual([["a@x.com", 2], ["b@x.com", 1]]);
    expect(topReferrers(rows, 1)).toHaveLength(1);
  });

  it("searches by email part, own code or the referrer's email", () => {
    expect(searchWaitlist(rows, cleanWaitlistSearch("  B@X "))).toHaveLength(2); // b, and d who came through b
    expect(searchWaitlist(rows, cleanWaitlistSearch("cccccc")).map((r) => r.email)).toEqual(["c@x.com"]);
    expect(searchWaitlist(rows, "")).toHaveLength(5);
  });

  it("writes a safe CSV", () => {
    expect(csvCell("=HYPERLINK()")).toBe("'=HYPERLINK()");
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    const csv = waitlistCsv(rows.slice(0, 2), SITE).split("\n");
    expect(csv[0]).toBe("email,joined,status,invite_code,invite_link,came_through,colleagues");
    expect(csv[1]).toBe("c@x.com,2026-10-23T15:00:00Z,Unsubscribed,CCCCCC,https://auraprotocols.com/?r=CCCCCC,a@x.com,0");
    expect(csv[2]).toBe("d@x.com,2026-10-23T05:00:00Z,Not confirmed,,,b@x.com,0");
  });
});
