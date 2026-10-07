import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { PERMISSIONS } from "@/lib/staff/permissions";

const ROOT = join(__dirname, "../../src/app/admin");
const walk = (d: string): string[] => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const entryFiles = walk(ROOT).filter((p) => /[\\/](page|layout)\.tsx$|[\\/]route\.ts$|[\\/]actions\.ts$/.test(p));
const rel = (p: string) => relative(ROOT, p).replace(/\\/g, "/");

// Expected permission per exported action (name → permission).
export const ACTION_PERMS: Record<string, Record<string, string>> = {
  "actions.ts": { resolveAlertAction: "alerts.resolve" },
  "orders/actions.ts": { markShippedAction: "orders.ship", refundCreditOrderAction: "orders.refund_credit" },
  "customers/actions.ts": { adjustCreditAction: "credit.adjust", blockAction: "customers.block", unblockAction: "customers.block", resendVerifyAdminAction: "customers.resend_verify" },
  "discounts/actions.ts": { saveCodeAction: "discounts.edit", codeAvailableAction: "discounts.edit", setCodeStateAction: "discounts.edit", resetUseAction: "discounts.edit", setCapAction: "discounts.settings" },
  "disputes/actions.ts": { saveDisputeDraftAction: "disputes.draft", submitDisputeAction: "disputes.submit", refundEarlyWarningAction: "disputes.warnings", watchEarlyWarningAction: "disputes.warnings" },
  "catalog/actions.ts": {
    coaUploadAction: "lots.receive", receiveLotAction: "lots.receive", replaceCertificateAction: "lots.receive",
    putLiveAction: "lots.put_live", retireAction: "lots.put_live", correctCountAction: "stock.correct",
    setFieldAction: "catalog.edit", setShownAction: "catalog.edit", addStrengthAction: "catalog.edit", setStrengthShownAction: "catalog.edit",
    archiveStrengthAction: "catalog.edit", restoreStrengthAction: "catalog.edit", deleteStrengthAction: "catalog.edit",
  },
  "email/actions.ts": {
    saveCampaignAction: "email.draft", copyAction: "email.draft", announceAction: "email.draft",
    sendTestAction: "email.send", scheduleAction: "email.send", unscheduleAction: "email.send", sendNowAction: "email.send", stopAction: "email.send",
    setAutomationAction: "email.pause",
  },
  "inquiries/actions.ts": {
    replyAction: "inquiries.reply", statusAction: "inquiries.reply", topicAction: "inquiries.reply", linkAction: "inquiries.reply", unlinkAction: "inquiries.reply",
    dismissUnmatchedAction: "inquiries.reply", attachUnmatchedAction: "inquiries.reply",
    saveReplyAction: "inquiries.saved_replies", deleteReplyAction: "inquiries.saved_replies",
    saveDraftAction: "inquiries.draft", discardDraftAction: "inquiries.draft",
  },
  "partners/actions.ts": { setPartnerStatusAction: "partners.manage" },
  "payouts/actions.ts": { markPayoutPaidAction: "payouts.mark_paid", openW9Action: "w9.open", markW9CheckedAction: "w9.open" },
  "team/actions.ts": { disableStaffAction: "staff.manage", enableStaffAction: "staff.manage", signOutStaffAction: "staff.manage" },
};

// The first permission check inside each exported function body.
function exportedChecks(src: string): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  const re = /export (?:default )?async function (\w+)?\s*\(/g;
  const starts: Array<{ name: string; at: number }> = [];
  for (let m; (m = re.exec(src)); ) starts.push({ name: m[1] ?? "default", at: m.index });
  starts.forEach((s, i) => {
    const body = src.slice(s.at, starts[i + 1]?.at ?? src.length);
    const hit = body.match(/require(?:Permission\("([\w.]+)"\)|Staff\(\))/);
    out[s.name] = hit ? (hit[1] ?? "staff") : null;
  });
  return out;
}

describe("every admin entry point checks a permission", () => {
  it("nothing calls requireOwner any more", () => {
    for (const f of walk(ROOT)) expect(readFileSync(f, "utf8"), rel(f)).not.toMatch(/requireOwner/);
    expect(readFileSync(join(__dirname, "../../src/lib/dal.ts"), "utf8")).not.toMatch(/export async function requireOwner/);
  });

  it("pages, layouts and routes check a view permission (or any staff login)", () => {
    for (const f of entryFiles.filter((p) => !p.endsWith("actions.ts"))) {
      const checks = exportedChecks(readFileSync(f, "utf8"));
      const vals = Object.values(checks);
      expect(vals.length, rel(f)).toBeGreaterThan(0);
      for (const v of vals) expect(v, rel(f)).not.toBeNull();
      for (const v of vals) if (v !== "staff") expect(PERMISSIONS as readonly string[], rel(f)).toContain(v);
    }
  });

  it("each action asks for exactly the mapped permission", () => {
    for (const f of entryFiles.filter((p) => p.endsWith("actions.ts"))) {
      const key = rel(f);
      const want = ACTION_PERMS[key];
      expect(want, `${key} missing from ACTION_PERMS`).toBeDefined();
      const got = exportedChecks(readFileSync(f, "utf8"));
      expect(got).toEqual(want);
    }
  });
});
