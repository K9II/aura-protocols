import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { getLiveCatalog } from "@/lib/catalog-live";
import { codeStatsById, getCodeById } from "@/lib/discounts/data";
import { codeStatus, customerSummary, termsFromRow } from "@/lib/discounts/rules";
import { unannouncedLots } from "@/lib/email/lots";
import { logEmailAdminEvent, type EmailAdminAction } from "@/lib/email/admin-data";
import { canMove, type Audience, type CampaignContent, type CampaignFields, type CampaignKind, type CampaignStatus } from "@/lib/email/campaigns/rules";
import type { CodeFacts } from "@/lib/email/campaigns/checks";
import type { RenderCode } from "@/lib/email/campaigns/render";
import type { AlertLot } from "@/lib/emails-marketing";
import { CAMPAIGNS_PER_PAGE } from "@/lib/email/constants";

const db = () => getSupabaseAdminClient();
const fail = (what: string, error: unknown): never => { throw new Error(`${what} failed: ${JSON.stringify(error)}`); };
const STALE = "That campaign changed — reload the page.";

export type CampaignRow = {
  id: string; kind: CampaignKind; status: CampaignStatus; name: string; subject: string; preview_text: string;
  content: CampaignContent; audience: Audience; discount_code_id: string | null; lots_snapshot: AlertLot[];
  scheduled_for: string | null; started_at: string | null; finished_at: string | null; recipients: number;
  created_by: string | null; created_at: string; updated_at: string;
};

export async function getCampaign(id: string): Promise<CampaignRow | null> {
  const { data, error } = await db().from("campaigns").select("*").eq("id", id).maybeSingle();
  if (error) fail("campaign read", error);
  return (data as CampaignRow | null) ?? null;
}

export type CampaignTab = "all" | "draft" | "scheduled" | "sent";
export async function listCampaigns(tab: CampaignTab, page: number): Promise<{ rows: CampaignRow[]; total: number }> {
  let q = db().from("campaigns").select("*", { count: "exact" });
  if (tab === "draft") q = q.eq("status", "draft");
  if (tab === "scheduled") q = q.eq("status", "scheduled");
  if (tab === "sent") q = q.in("status", ["sending", "sent", "stopped"]);
  const fromRow = (page - 1) * CAMPAIGNS_PER_PAGE;
  const { data, error, count } = await q.order("created_at", { ascending: false }).range(fromRow, fromRow + CAMPAIGNS_PER_PAGE - 1);
  if (error) fail("campaign list", error);
  return { rows: (data ?? []) as CampaignRow[], total: count ?? 0 };
}

export async function campaignCounts(): Promise<Record<CampaignTab, number>> {
  const { data, error } = await db().from("campaigns").select("status");
  if (error) fail("campaign counts", error);
  const rows = (data ?? []) as { status: CampaignStatus }[];
  return {
    all: rows.length,
    draft: rows.filter((r) => r.status === "draft").length,
    scheduled: rows.filter((r) => r.status === "scheduled").length,
    sent: rows.filter((r) => ["sending", "sent", "stopped"].includes(r.status)).length,
  };
}

// ---------- lots ----------
async function announcedLots(): Promise<Set<string>> {
  const { data, error } = await db().from("lot_announcements").select("lots").not("finished_at", "is", null);
  if (error) fail("lot announcements read", error);
  return new Set(((data ?? []) as { lots: string[] }[]).flatMap((r) => r.lots));
}

async function newLotsCampaigns(): Promise<Array<{ id: string; status: CampaignStatus; lots_snapshot: { lot: string }[] }>> {
  const { data, error } = await db().from("campaigns").select("id, status, lots_snapshot").eq("kind", "new_lots");
  if (error) fail("new lots campaigns read", error);
  return (data ?? []) as Array<{ id: string; status: CampaignStatus; lots_snapshot: { lot: string }[] }>;
}

// Lots a New lots campaign may announce: live, certified, on the store, not
// announced (old lot_announcements or a started campaign) and not in another
// open (draft/scheduled) campaign. A draft's own lots stay choosable.
export async function lotChoices(campaignId: string | null): Promise<AlertLot[]> {
  const [live, announced, campaigns] = await Promise.all([getLiveCatalog(), announcedLots(), newLotsCampaigns()]);
  const taken = new Set(announced);
  for (const c of campaigns) {
    if (c.id === campaignId) continue;
    for (const l of c.lots_snapshot) taken.add(l.lot);
  }
  return unannouncedLots(live.lots, taken);
}

// Overview card + nav count: waiting = not announced and not in any open campaign.
export const waitingLots = (): Promise<AlertLot[]> => lotChoices(null);

// ---------- codes ----------
export async function codeForCampaign(codeId: string | null): Promise<{ facts: CodeFacts; render: RenderCode } | null> {
  if (!codeId) return null;
  const [row, stats] = await Promise.all([getCodeById(codeId), codeStatsById()]);
  if (!row) return null;
  const s = stats.get(codeId);
  const uses = (s?.uses ?? 0) + (s?.held ?? 0);
  return {
    facts: { code: row.code, status: codeStatus(row, uses), startsAt: row.starts_at, endsAt: row.ends_at, maxUses: row.max_uses, uses },
    render: { code: row.code, summary: customerSummary(termsFromRow(row)), endsAt: row.ends_at, oncePerCustomer: row.once_per_customer, minOrderCents: row.min_order_cents },
  };
}

// ---------- writes ----------
const toRow = (f: CampaignFields, lots: AlertLot[]) => ({
  name: f.name, subject: f.subject, preview_text: f.previewText, content: f.content, audience: f.audience,
  discount_code_id: f.discountCodeId, lots_snapshot: lots, updated_at: new Date().toISOString(),
});

export async function createCampaign(kind: CampaignKind, f: CampaignFields, lots: AlertLot[], actor: string): Promise<string> {
  const { data, error } = await db().from("campaigns").insert({ kind, status: "draft", created_by: actor, ...toRow(f, lots) }).select("id").single();
  if (error || !data) fail("campaign insert", error ?? "no row");
  const id = (data as { id: string }).id;
  await logEmailAdminEvent({ action: "created", target: id, actor });
  return id;
}

export async function updateDraft(id: string, f: CampaignFields, lots: AlertLot[]): Promise<void> {
  const { data, error } = await db().from("campaigns").update(toRow(f, lots)).eq("id", id).eq("status", "draft").select("id");
  if (error) fail("campaign update", error);
  if (!Array.isArray(data) || data.length === 0) throw new Error(STALE);
}

const MOVE_ACTION: Partial<Record<CampaignStatus, EmailAdminAction>> = { scheduled: "scheduled", draft: "unscheduled", stopped: "stopped", sent: "finished" };

// Every status change except → sending (admin_start_campaign) goes through here.
export async function moveCampaign(id: string, from: CampaignStatus, to: CampaignStatus, actor: string | null, o: { scheduledFor?: string } = {}): Promise<void> {
  if (!canMove(from, to) || to === "sending") throw new Error(`Not allowed: ${from} → ${to}`);
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { status: to, updated_at: now };
  if (to === "scheduled") patch.scheduled_for = o.scheduledFor;
  if (to === "draft") patch.scheduled_for = null;
  if (to === "sent" || to === "stopped") patch.finished_at = now;
  const { data, error } = await db().from("campaigns").update(patch).eq("id", id).eq("status", from).select("id");
  if (error) fail("campaign move", error);
  if (!Array.isArray(data) || data.length === 0) throw new Error(STALE);
  const action = MOVE_ACTION[to];
  if (action) await logEmailAdminEvent({ action, target: id, actor, ...(to === "scheduled" ? { note: o.scheduledFor } : {}) });
}

export async function startCampaign(id: string, actor: string | null, from: "draft" | "scheduled"): Promise<{ ok: true; recipients: number } | { ok: false; reason: "busy" | "stale" }> {
  const { data, error } = await db().rpc("admin_start_campaign", { p_id: id, p_actor: actor, p_from: from });
  if (error) {
    const e = error as { message?: string; code?: string };
    const msg = String(e.message ?? "");
    // 23505 = the campaigns_one_sending unique index: another campaign is already sending.
    if (msg.includes("campaign_busy") || e.code === "23505") return { ok: false, reason: "busy" };
    if (msg.includes("stale_campaign")) return { ok: false, reason: "stale" };
    fail("campaign start", error);
  }
  return { ok: true, recipients: Number(data) };
}

// The hourly run: the one sending campaign first, then scheduled ones that are due.
export async function campaignsToRun(nowMs: number): Promise<CampaignRow[]> {
  const { data, error } = await db().from("campaigns").select("*")
    .or(`status.eq.sending,and(status.eq.scheduled,scheduled_for.lte.${new Date(nowMs).toISOString()})`)
    .order("status", { ascending: false }) // 'sending' sorts after 'scheduled' ascending → first descending
    .order("scheduled_for", { ascending: true });
  if (error) fail("campaigns to run", error);
  return (data ?? []) as CampaignRow[];
}

// ---------- recipients ----------
export async function pendingRecipients(id: string, afterEmail: string, limit: number): Promise<Array<{ email: string; attempts: number }>> {
  const { data, error } = await db().from("campaign_recipients").select("email, attempts")
    .eq("campaign_id", id).eq("state", "pending").gt("email", afterEmail).order("email").limit(limit);
  if (error) fail("recipients read", error);
  return (data ?? []) as Array<{ email: string; attempts: number }>;
}

// Only a row still "pending" is updated, so an overlapping run (a retried
// cron tick, Send now pressed twice) can't overwrite one already "sent".
export async function setRecipient(id: string, email: string, patch: { state: "sent" | "skipped" | "failed" | "pending"; attempts?: number; last_error?: string | null }): Promise<void> {
  const row: Record<string, unknown> = { ...patch };
  if (patch.state === "sent") row.sent_at = new Date().toISOString();
  const { error } = await db().from("campaign_recipients").update(row).eq("campaign_id", id).eq("email", email).eq("state", "pending");
  if (error) fail("recipient update", error);
}

// The Email nav badge: lots waiting to announce + drafts. Cosmetic — a read
// failure logs and shows no badge rather than breaking every admin page.
export async function emailNavCount(): Promise<number> {
  try {
    const [lots, drafts] = await Promise.all([
      waitingLots(),
      db().from("campaigns").select("id", { count: "exact", head: true }).eq("status", "draft"),
    ]);
    if (drafts.error) throw new Error(JSON.stringify(drafts.error));
    return lots.length + (drafts.count ?? 0);
  } catch (err) {
    console.error("email nav count failed:", err);
    return 0;
  }
}

export async function recipientCounts(id: string): Promise<{ pending: number; sent: number; skipped: number; failed: number }> {
  const { data, error } = await db().from("campaign_recipients").select("state").eq("campaign_id", id);
  if (error) fail("recipient counts", error);
  const rows = (data ?? []) as { state: string }[];
  const n = (s: string) => rows.filter((r) => r.state === s).length;
  return { pending: n("pending"), sent: n("sent"), skipped: n("skipped"), failed: n("failed") };
}
