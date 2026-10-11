import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { PERMISSIONS } from "@/lib/staff/permissions";

const ROOT = join(__dirname, "../../src/app/admin");
const walk = (d: string): string[] => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const entryFiles = walk(ROOT).filter((p) => /[\\/](page|layout)\.tsx$|[\\/]route\.ts$|[\\/]actions\.ts$/.test(p));
const rel = (p: string) => relative(ROOT, p).replace(/\\/g, "/");

// Expected permission per exported page/layout/route default export (or GET).
// Source of truth: implementer-rules' Task 6 table, plus /admin/team.
const PAGE_PERMS: Record<string, string> = {
  "layout.tsx": "staff",
  "guide/page.tsx": "staff",
  "page.tsx": "today.view",
  "alerts/page.tsx": "today.view",
  "activity/page.tsx": "activity.view",
  "orders/page.tsx": "orders.view",
  "orders/[number]/page.tsx": "orders.view",
  "orders/[number]/pick/page.tsx": "orders.view",
  "orders/new/page.tsx": "orders.no_charge",
  "wholesale/page.tsx": "wholesale.view",
  "wholesale/runs/[id]/page.tsx": "wholesale.view",
  "wholesale/settings/page.tsx": "wholesale.view",
  "wholesale/margins/page.tsx": "wholesale.margins",
  "customers/page.tsx": "customers.view",
  "customers/[id]/page.tsx": "customers.view",
  "discounts/page.tsx": "discounts.view",
  "discounts/[id]/page.tsx": "discounts.view",
  "discounts/batch/[id]/page.tsx": "discounts.view",
  "discounts/batch/[id]/codes.csv/route.ts": "discounts.view",
  "discounts/new/page.tsx": "discounts.edit",
  "discounts/[id]/edit/page.tsx": "discounts.edit",
  "discounts/settings/page.tsx": "discounts.settings",
  "disputes/page.tsx": "disputes.view",
  "disputes/[id]/page.tsx": "disputes.view",
  "disputes/[id]/evidence.pdf/route.ts": "disputes.view",
  "catalog/page.tsx": "catalog.view",
  "catalog/[slug]/page.tsx": "catalog.view",
  "email/page.tsx": "email.view",
  "email/runs/page.tsx": "email.view",
  "email/campaigns/[id]/page.tsx": "email.view",
  "email/campaigns/new/page.tsx": "email.draft",
  "inquiries/page.tsx": "inquiries.view",
  "inquiries/[ref]/page.tsx": "inquiries.view",
  "inquiries/replies/page.tsx": "inquiries.view",
  "partners/page.tsx": "partners.view",
  "partners/[id]/page.tsx": "partners.view",
  "payouts/page.tsx": "payouts.view",
  "team/page.tsx": "staff.manage",
};

// Expected permission per exported action (name → permission).
export const ACTION_PERMS: Record<string, Record<string, string>> = {
  "actions.ts": { resolveAlertAction: "alerts.resolve" },
  "orders/actions.ts": { markShippedAction: "orders.ship", refundOrderAction: "orders.refund", createNoChargeOrderAction: "orders.no_charge", cancelNoChargeOrderAction: "orders.no_charge" },
  "customers/actions.ts": { setCustomerWholesaleAction: "wholesale.manage", adjustCreditAction: "credit.adjust", blockAction: "customers.block", unblockAction: "customers.block", resendVerifyAdminAction: "customers.resend_verify" },
  "discounts/actions.ts": { saveCodeAction: "discounts.edit", codeAvailableAction: "discounts.edit", setCodeStateAction: "discounts.edit", resetUseAction: "discounts.edit", setCapAction: "discounts.settings" },
  "wholesale/actions.ts": {
    recordLineOrderAction: "wholesale.manage", linkLotAction: "wholesale.manage", passLineAction: "wholesale.manage", failLineAction: "wholesale.manage",
    resourceLineAction: "wholesale.manage", saveRunNotesAction: "wholesale.manage", cancelDepositAction: "wholesale.manage", saveWholesaleSettingsAction: "wholesale.manage",
    markWholesaleReviewedAction: "wholesale.manage",
  },
  "disputes/actions.ts": { saveDisputeDraftAction: "disputes.draft", submitDisputeAction: "disputes.submit", refundEarlyWarningAction: "disputes.warnings", watchEarlyWarningAction: "disputes.warnings" },
  "catalog/actions.ts": {
    coaUploadAction: "lots.receive", receiveLotAction: "lots.receive", replaceCertificateAction: "lots.receive",
    putLiveAction: "lots.put_live", retireAction: "lots.put_live", correctCountAction: "stock.correct",
    setFieldAction: "catalog.edit", setShownAction: "catalog.edit", setWholesaleAction: "catalog.edit", addStrengthAction: "catalog.edit", setStrengthShownAction: "catalog.edit",
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

// ---------- the checker ----------
// Strips comments first, so a commented-out call can never satisfy anything
// below. Not a full tokenizer (a "//" inside a string literal would also be
// stripped) — good enough for this codebase's admin files, which don't do
// that in a way that matters here.
export function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

// Start positions of every top-level declaration (another export, a bare
// helper function, a module-level const/let, a class) — column 0, as this
// codebase always indents inside a function body. Used only to cap how far
// a function's "first statement" search can reach, so a helper or a later
// declaration can never leak into an earlier function's check.
function topLevelStarts(src: string): number[] {
  return [...src.matchAll(/^(?:export\s+)?(?:default\s+)?(?:async\s+function|function|const|let|class)\b/gm)].map((m) => m.index!);
}

// The index just past a function's body-opening "{", given the index of the
// "(" that starts its parameter list. Balances the parameter list's parens
// first (ignoring any () / {} nested inside, since the paren count alone
// decides where the list ends), then — if a ": ReturnType" annotation
// follows — walks past it by tracking combined <>/{} depth (so a return
// type like `Promise<{ ok: boolean }>` doesn't fool this into stopping at
// the type's own brace instead of the real function body).
function findBodyStart(src: string, openParenAt: number): number {
  let i = openParenAt, depth = 0;
  do {
    if (src[i] === "(") depth++;
    else if (src[i] === ")") depth--;
    i++;
  } while (depth > 0 && i < src.length);
  while (/\s/.test(src[i])) i++;
  if (src[i] === ":") {
    i++;
    let d = 0, started = false;
    while (i < src.length) {
      const c = src[i];
      if (c === "<" || c === "{") { d++; started = true; }
      else if (c === ">" || c === "}") d--;
      i++;
      if (started && d === 0) break;
    }
  }
  while (i < src.length && src[i] !== "{") i++;
  return i + 1;
}

const ASSIGN_OR_BARE_CALL = /^(?:(?:const|let)\s+\w+\s*=\s*)?await\s+require(?:Permission\("([\w.]+)"\)|Staff\(\))\s*;$/;
// The disputes form: `return respond(f, <bool>, await requirePermission("…"));`.
const DISPUTES_FORM = /^return\s+respond\(f,\s*[^,]+,\s*await\s+requirePermission\("([\w.]+)"\)\)\s*;$/;

// The permission (or "staff" for requireStaff()) checked by each exported
// function's FIRST statement — never a call anywhere later in its body,
// never one found inside a different (helper) function.
export function exportedChecks(srcRaw: string): Record<string, string | null> {
  const src = stripComments(srcRaw);
  const tops = topLevelStarts(src);
  const out: Record<string, string | null> = {};
  const re = /export (?:default )?async function (\w+)?\s*\(/g;
  for (let m; (m = re.exec(src)); ) {
    const name = m[1] ?? "default";
    const openParenAt = re.lastIndex - 1;
    const bodyStart = findBodyStart(src, openParenAt);
    const hardEnd = tops.find((idx) => idx > bodyStart) ?? src.length;
    let j = bodyStart, depth = 0, stmtEnd = hardEnd;
    for (; j < hardEnd; j++) {
      const c = src[j];
      if (c === "(" || c === "[" || c === "{") depth++;
      else if (c === ")" || c === "]" || c === "}") depth--;
      else if (c === ";" && depth === 0) { stmtEnd = j + 1; break; }
    }
    const stmt = src.slice(bodyStart, stmtEnd).trim();
    const hit = stmt.match(ASSIGN_OR_BARE_CALL) ?? stmt.match(DISPUTES_FORM);
    out[name] = hit ? (hit[1] ?? "staff") : null;
  }
  return out;
}

// Actions must be `export async function` — an `export const` or a
// re-export (`export { ... }`) would be invisible to exportedChecks above
// and so could ship a brand-new, totally unguarded action.
export function hasNonFunctionExport(srcRaw: string): boolean {
  const src = stripComments(srcRaw);
  return /^export const\b/m.test(src) || /^export \{/m.test(src);
}

describe("every admin entry point checks a permission", () => {
  it("nothing calls requireOwner any more", () => {
    for (const f of walk(ROOT)) expect(readFileSync(f, "utf8"), rel(f)).not.toMatch(/requireOwner/);
    expect(readFileSync(join(__dirname, "../../src/lib/dal.ts"), "utf8")).not.toMatch(/export async function requireOwner/);
  });

  it("every page, layout and route checks exactly its mapped permission", () => {
    for (const f of entryFiles.filter((p) => !p.endsWith("actions.ts"))) {
      const key = rel(f);
      const want = PAGE_PERMS[key];
      expect(want, `${key} missing from PAGE_PERMS`).toBeDefined();
      const got = Object.values(exportedChecks(readFileSync(f, "utf8")));
      expect(got, key).toEqual([want]);
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

  it("PAGE_PERMS and ACTION_PERMS only name real permissions (a typo there would otherwise match itself)", () => {
    const values = [...Object.values(PAGE_PERMS), ...Object.values(ACTION_PERMS).flatMap((m) => Object.values(m))];
    for (const v of values) if (v !== "staff") expect(PERMISSIONS as readonly string[], v).toContain(v);
  });

  it("actions.ts files only export async functions — never export const or export { ... }", () => {
    for (const f of entryFiles.filter((p) => p.endsWith("actions.ts"))) {
      expect(hasNonFunctionExport(readFileSync(f, "utf8")), rel(f)).toBe(false);
    }
  });
});

// The checker above reads source text, not imports — it can't be fooled by
// a mock. These prove it can't be fooled by the source text either.
describe("the checker itself can't be fooled", () => {
  it("a commented-out call doesn't count", () => {
    const src = [
      'export async function fooAction(f: FormData): Promise<void> {',
      '  // await requirePermission("orders.ship");',
      "  await doSomething();",
      "}",
    ].join("\n");
    expect(exportedChecks(src).fooAction).toBeNull();
  });

  it("a call after a side effect isn't the first statement", () => {
    const src = [
      'export async function fooAction(f: FormData): Promise<void> {',
      "  await doSomething();",
      '  await requirePermission("orders.ship");',
      "}",
    ].join("\n");
    expect(exportedChecks(src).fooAction).toBeNull();
  });

  it("a check buried in a non-exported helper doesn't count for the exported function that calls it", () => {
    const src = [
      'export async function fooAction(f: FormData): Promise<void> {',
      "  return helper();",
      "}",
      "function helper() {",
      '  return requirePermission("orders.ship");',
      "}",
    ].join("\n");
    expect(exportedChecks(src).fooAction).toBeNull();
  });

  it("an un-awaited call doesn't count", () => {
    const src = [
      'export async function fooAction(f: FormData): Promise<void> {',
      '  const owner = requirePermission("orders.ship");',
      "}",
    ].join("\n");
    expect(exportedChecks(src).fooAction).toBeNull();
  });

  it("an `export const` action is caught by the file-level rule, not the per-function checker — and is invisible to that checker, which is exactly why the file-level rule exists", () => {
    const src = [
      "export const fooAction = async (f: FormData) => {",
      '  await requirePermission("orders.ship");',
      "};",
    ].join("\n");
    expect(hasNonFunctionExport(src)).toBe(true);
    expect(Object.keys(exportedChecks(src))).toHaveLength(0);
  });

  it("a return-type annotation with its own braces doesn't fool the body-start search (coaUploadAction-shaped signature)", () => {
    const src = [
      "export async function fooAction(lotNumber: string): Promise<{ path: string; token: string } | { error: string }> {",
      '  await requirePermission("lots.receive");',
      "}",
    ].join("\n");
    expect(exportedChecks(src).fooAction).toBe("lots.receive");
  });
});
