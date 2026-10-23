"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/dal";
import {
  createCampaign, getCampaign, lotChoices, moveCampaign, prelaunchCampaigns, startCampaign, updateDraft, waitingLots, type CampaignRow,
} from "@/lib/email/campaigns/data";
import { campaignCode, earlyRun, renderFor, sendCampaignBatch } from "@/lib/email/campaigns/send";
import { setEarlyAccessOpen } from "@/lib/early/data";
import { openingLabel, parseOpeningOn } from "@/lib/early/rules";
import { earlyPreview } from "@/lib/email/prelaunch";
import { announceDraft, isPrelaunch, parseCampaignForm, parseKind, PRELAUNCH, scheduleError, type CampaignFields } from "@/lib/email/campaigns/rules";
import { isBlocked, type Check } from "@/lib/email/campaigns/checks";
import { checksFor } from "@/lib/email/campaigns/checks-server";
import { sendTracked } from "@/lib/email/data";
import { logEmailAdminEvent, setAutomationPaused, AUTOMATION_LABEL, type Automation } from "@/lib/email/admin-data";
import { SEND_TIME_BUDGET_MS } from "@/lib/email/constants";
import { zonedToIso } from "@/lib/discounts/time";
import { alertOwner } from "@/lib/notify";

export type EmailActionState = { ok?: string; error?: string; fieldErrors?: Record<string, string>; checks?: Check[]; savedAt?: string } | null;

const STALE = "That campaign changed — reload the page.";
const str = (f: FormData, k: string) => String(f.get(k) ?? "");
const refresh = (id?: string) => { revalidatePath("/admin/email"); if (id) revalidatePath(`/admin/email/campaigns/${id}`); };

async function target(f: FormData): Promise<CampaignRow> {
  const id = z.string().uuid().safeParse(f.get("id"));
  if (!id.success) throw new Error(STALE);
  const c = await getCampaign(id.data);
  if (!c) throw new Error(STALE);
  // Send test / Schedule / Send now carry the campaign's updated_at from
  // when their dialog opened (CampaignEditor), so a save that happened in
  // another tab or after a stale reload refuses here instead of sending,
  // scheduling or testing against content the owner never saw. Actions that
  // don't submit this field (save, copy, stop, unschedule) skip the check.
  const updatedAt = str(f, "updatedAt");
  if (updatedAt && updatedAt !== c.updated_at) throw new Error(STALE);
  return c;
}

function formFields(f: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of ["name", "subject", "previewText", "headline", "body", "buttonLabel", "buttonPath", "audience", "discountCodeId"]) out[k] = str(f, k);
  return out;
}

export async function saveCampaignAction(_prev: EmailActionState, f: FormData): Promise<EmailActionState> {
  const owner = await requirePermission("email.draft");
  const existing = f.get("id") ? await target(f) : null;
  if (existing && existing.status !== "draft") throw new Error(STALE);
  const kind = existing?.kind ?? parseKind(str(f, "kind"));
  const choices = kind === "new_lots" ? await lotChoices(existing?.id ?? null) : [];
  const ticked = f.getAll("lots").map(String);
  const lots = choices.filter((l) => ticked.includes(l.lot));
  const p = parseCampaignForm(kind, formFields(f), lots.map((l) => l.lot));
  if (!p.ok) return { fieldErrors: p.fieldErrors };
  if (!existing) {
    const id = await createCampaign(kind, p.value, lots, owner.id);
    refresh();
    redirect(`/admin/email/campaigns/${id}`);
  }
  await updateDraft(existing.id, p.value, lots);
  await logEmailAdminEvent({ action: "edited", target: existing.id, actor: owner.id });
  refresh(existing.id);
  const saved = await getCampaign(existing.id);
  return { ok: "Saved.", checks: await checksFor(saved!, Date.now()), savedAt: new Date().toISOString() };
}

export async function sendTestAction(_prev: EmailActionState, f: FormData): Promise<EmailActionState> {
  const owner = await requirePermission("email.send");
  const c = await target(f);
  const code = await campaignCode(c);
  const { msg, unsub } = await renderFor(c, owner.email, code, { test: true }, await earlyRun(c, owner.id));
  await sendTracked({ email: owner.email, kind: "campaign", ref: `test-${c.id}-${Date.now()}`, msg, unsubscribeUrl: unsub });
  await logEmailAdminEvent({ action: "test_sent", target: c.id, actor: owner.id, note: owner.email });
  refresh(c.id);
  return { ok: `Test sent to ${owner.email}.` };
}

export async function scheduleAction(_prev: EmailActionState, f: FormData): Promise<EmailActionState> {
  const owner = await requirePermission("email.send");
  const c = await target(f);
  if (c.status !== "draft") throw new Error(STALE);
  const local = str(f, "at");
  const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local) ? zonedToIso(local) : "";
  const err = scheduleError(iso);
  if (err) return { fieldErrors: { at: err } };
  const checks = await checksFor(c, Date.parse(iso));
  if (isBlocked(checks)) return { error: "Fix the problems listed under Checks first.", checks };
  await moveCampaign(c.id, "draft", "scheduled", owner.id, { scheduledFor: iso });
  refresh(c.id);
  return { ok: "Scheduled." };
}

export async function unscheduleAction(f: FormData): Promise<void> {
  const owner = await requirePermission("email.send");
  const c = await target(f);
  await moveCampaign(c.id, "scheduled", "draft", owner.id);
  refresh(c.id);
}

// Note: "Send now" can still leave work for the hourly run — a large list
// won't always clear within SEND_TIME_BUDGET_MS, and the failure breaker in
// sendCampaignBatch can trip mid-batch (looks like an outage: SES down, a
// bad template). Neither of those is "done" and the copy below must never
// say so. sendCampaignBatch can also THROW before touching a single
// recipient (a config problem, or — for a promotion — a missing discount
// code): the campaign is already "sending" by then (startCampaign moved it),
// so it's left there on purpose — the hourly run picks the same campaign up
// and tries again once the real problem (e.g. a deleted code) is fixed. The
// owner is alerted either way and told plainly, never led to believe it sent.
// Once startCampaign has moved the row to "sending", the next render of
// /admin/email/campaigns/[id] shows CampaignResults instead of the editor —
// revalidatePath (refresh) can make that swap happen before the owner ever
// sees the error state a dialog would otherwise hold, unmounting it with the
// message. Redirect with the message in a query param instead, so the
// results view (which CampaignPage reads it for) can still show it.
const sendErrorRedirect = (id: string, message: string): never => redirect(`/admin/email/campaigns/${id}?sendError=${encodeURIComponent(message)}`);

export async function sendNowAction(_prev: EmailActionState, f: FormData): Promise<EmailActionState> {
  const owner = await requirePermission("email.send");
  const c = await target(f);
  const from = str(f, "from") === "scheduled" ? "scheduled" : "draft";
  const checks = await checksFor(c, Date.now());
  if (isBlocked(checks)) return { error: "Fix the problems listed under Checks first.", checks };
  const s = await startCampaign(c.id, owner.id, from);
  if (!s.ok) {
    if (s.reason === "busy") return { error: "Another campaign is sending. Send this one when it finishes, or schedule it." };
    throw new Error(STALE);
  }
  // Early access: the links must work the moment the first email lands, so the switch goes
  // on before anything is sent (already on = nothing to do).
  if (c.kind === "early_access" && await setEarlyAccessOpen(true)) {
    await logEmailAdminEvent({ action: "early_access_on", target: c.id, actor: owner.id, note: "sending Your early access is open" });
  }
  let r;
  try {
    r = await sendCampaignBatch(c.id, Date.now() + SEND_TIME_BUDGET_MS);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await alertOwner("Campaign send now failed to start", `"${c.name}" (${c.id}): ${message}`);
    refresh(c.id);
    return sendErrorRedirect(c.id, `Sending hit a problem: ${message}. Anything not yet sent goes out on the next hourly run once it's fixed, or press Stop.`);
  }
  refresh(c.id);
  const n = r.sent.toLocaleString("en-US");
  let ok: string;
  if (!r.finished && !r.stopped && r.failed > 0) {
    // The failure breaker tripped (or the batch otherwise ended mid-run with
    // failures): a partial failure, shown as an error, never as success.
    return sendErrorRedirect(c.id, `${n} sent. ${r.failed.toLocaleString("en-US")} couldn't be sent; ${r.remaining.toLocaleString("en-US")} still to go — the hourly run will try again.`);
  } else if (r.remaining) {
    ok = `${n} sent. The other ${r.remaining.toLocaleString("en-US")} go out on the next hourly run.`;
  } else {
    ok = `Sent to ${n} people.`;
  }
  return { ok };
}

// Stop takes effect within CAMPAIGN_STOP_CHECK_EVERY sends (a few seconds),
// not the instant the owner clicks — never return copy here that promises
// otherwise.
export async function stopAction(f: FormData): Promise<void> {
  const owner = await requirePermission("email.send");
  const c = await target(f);
  await moveCampaign(c.id, "sending", "stopped", owner.id);
  refresh(c.id);
}

export async function copyAction(f: FormData): Promise<void> {
  const owner = await requirePermission("email.draft");
  const c = await target(f);
  if (isPrelaunch(c.kind)) throw new Error("Pre-launch emails go once. Open this one from the Pre-launch box.");
  const choices = c.kind === "new_lots" ? await lotChoices(null) : [];
  const keep = new Set(choices.map((l) => l.lot));
  const lots = c.lots_snapshot.filter((l) => keep.has(l.lot));
  const fields: CampaignFields = {
    name: `${c.name} (copy)`.slice(0, 120), subject: c.subject, previewText: c.preview_text, audience: c.audience,
    content: c.content, discountCodeId: c.discount_code_id, lots: lots.map((l) => l.lot),
  };
  const id = await createCampaign(c.kind, fields, lots, owner.id);
  await logEmailAdminEvent({ action: "copied", target: id, actor: owner.id, note: c.id });
  refresh();
  redirect(`/admin/email/campaigns/${id}`);
}

// Email → Pre-launch → Open: the pre-launch email's campaign, made the first time
// (fixed name, subject and audience; the wording lives in lib/email/prelaunch.ts).
export async function setUpPrelaunchAction(f: FormData): Promise<void> {
  const owner = await requirePermission("email.draft");
  const kind = str(f, "kind");
  if (!isPrelaunch(kind)) throw new Error("Unknown pre-launch email.");
  let row = (await prelaunchCampaigns())[kind];
  if (!row) {
    const p = PRELAUNCH[kind];
    try {
      await createCampaign(kind, {
        name: p.name, subject: p.subject, previewText: p.previewText, audience: p.audience,
        content: { headline: "", body: "", buttonLabel: "", buttonPath: "" }, discountCodeId: null, lots: [],
      }, [], owner.id);
    } catch (err) {
      // Opened in two tabs at once: the other one made it (one per kind) — open that.
      if (!(await prelaunchCampaigns())[kind]) throw err;
    }
    row = (await prelaunchCampaigns())[kind];
    refresh();
  }
  redirect(`/admin/email/campaigns/${row!.id}`);
}

// Early access's campaign page: the opening date the email names and the codes end from.
export async function setOpeningDateAction(_prev: EmailActionState, f: FormData): Promise<EmailActionState> {
  const owner = await requirePermission("email.draft");
  const c = await target(f);
  if (c.kind !== "early_access" || c.status !== "draft") throw new Error(STALE);
  const d = parseOpeningOn(str(f, "openingOn"), Date.now());
  if (!d.ok) return { fieldErrors: { openingOn: d.error } };
  await updateDraft(c.id, {
    name: c.name, subject: c.subject, previewText: earlyPreview(d.value), audience: c.audience,
    content: { ...c.content, openingOn: d.value }, discountCodeId: null, lots: [],
  }, []);
  await logEmailAdminEvent({ action: "edited", target: c.id, actor: owner.id, note: `opening date ${d.value}` });
  refresh(c.id);
  return { ok: `Opening date saved: ${openingLabel(d.value)}.` };
}

// Email → Pre-launch → Early access switch. Sending email 3 turns it on; off sends early
// browsers back to the coming-soon page (within a minute).
export async function setEarlyAccessAction(_prev: EmailActionState, f: FormData): Promise<EmailActionState> {
  const owner = await requirePermission("email.send");
  const open = str(f, "open") === "1";
  if (!(await setEarlyAccessOpen(open))) throw new Error("That switch changed — reload the page.");
  await logEmailAdminEvent({ action: open ? "early_access_on" : "early_access_off", target: "early_access", actor: owner.id });
  refresh();
  return { ok: open ? "Early access is on." : "Early access is off. Early links now show the coming-soon page." };
}

export async function announceAction(): Promise<void> {
  const owner = await requirePermission("email.draft");
  const lots = await waitingLots();
  if (!lots.length) redirect("/admin/email");
  const id = await createCampaign("new_lots", announceDraft(lots), lots, owner.id);
  refresh();
  redirect(`/admin/email/campaigns/${id}`);
}

export async function setAutomationAction(_prev: EmailActionState, f: FormData): Promise<EmailActionState> {
  const owner = await requirePermission("email.pause");
  const a = str(f, "automation");
  if (a !== "welcome" && a !== "cart") throw new Error("Unknown automation.");
  const paused = str(f, "paused") === "1";
  const note = str(f, "note").trim().slice(0, 300) || null;
  const changed = await setAutomationPaused(a as Automation, paused, owner.id, note);
  if (!changed) throw new Error("That switch changed — reload the page.");
  refresh();
  return { ok: `${AUTOMATION_LABEL[a as Automation]} ${paused ? "paused" : "turned back on"}.` };
}
