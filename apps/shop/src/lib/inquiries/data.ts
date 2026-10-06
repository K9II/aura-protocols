import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { currentMs } from "@/lib/clock";
import { alertOwner } from "@/lib/notify";
import { FILE_LINK_SECONDS, INQUIRIES_PER_PAGE, INQUIRY_AUTO_CLOSE_DAYS, INQUIRY_RATE_LIMITS } from "@/lib/inquiries/constants";
import { cleanSearch, nextStatus, parseRef, statusesForTab, type InquiryEventName, type InquiryRow, type Status, type Tab } from "@/lib/inquiries/rules";
import type { Topic } from "@/lib/inquiries/topics";
import { INQUIRY_PREVIEWS } from "@/lib/today/constants";

// Every read and write of the Inquiries module. Throws on a DB error (pages
// show the admin error page); nav counts never throw.
const db = () => getSupabaseAdminClient();
const fail = (what: string, error: unknown): never => { throw new Error(`${what} failed: ${JSON.stringify(error)}`); };
const nowIso = () => new Date(currentMs()).toISOString();
const COLS = "id, ref, topic, status, name, email, organization, order_number, customer_id, subject, created_at, last_activity_at, last_customer_at, waiting_since, closed_at, last_preview, last_from, message_count, file_count";
export const FILES_BUCKET = "inquiry-files";

export type ThreadInquiry = InquiryRow & { token: string };

// ---------- new inquiries (POST /api/inquiry) ----------
export async function createInquiry(i: {
  topic: Topic; subject: string; name: string; email: string; organization: string | null; orderNumber: string | null;
  message: string; customerId: string | null; token: string; ipHash: string | null;
}): Promise<{ id: string; ref: number }> {
  const { data, error } = await db().rpc("create_inquiry", {
    p_topic: i.topic, p_subject: i.subject, p_name: i.name, p_email: i.email, p_organization: i.organization,
    p_order_number: i.orderNumber, p_message: i.message, p_customer_id: i.customerId, p_token: i.token, p_ip_hash: i.ipHash,
  });
  if (error) fail("create_inquiry", error);
  const row = (Array.isArray(data) ? data[0] : data) as { id: string; ref: number } | undefined;
  if (!row) fail("create_inquiry", "no row returned");
  return { id: row!.id, ref: Number(row!.ref) };
}

// Counted from the inquiries table itself (ip_hash), so it holds across instances.
export async function underInquiryLimit(ipHash: string, nowMs: number): Promise<boolean> {
  for (const l of INQUIRY_RATE_LIMITS) {
    const { count, error } = await db().from("inquiries").select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash).gte("created_at", new Date(nowMs - l.windowMs).toISOString());
    if (error) fail("inquiry limit count", error);
    if ((count ?? 0) >= l.max) return false;
  }
  return true;
}

// ---------- reads ----------
export async function getInquiry(by: { id: string } | { ref: number } | { token: string }): Promise<ThreadInquiry | null> {
  const [col, val] = "id" in by ? ["id", by.id] : "ref" in by ? ["ref", by.ref] : ["token", by.token];
  const { data, error } = await db().from("inquiries").select(`${COLS}, token`).eq(col, val).maybeSingle();
  if (error) fail("inquiry read", error);
  return (data as ThreadInquiry | null) ?? null;
}

const ORDER: Record<Exclude<Tab, "unmatched">, [string, boolean]> = {
  open: ["last_customer_at", true], waiting: ["waiting_since", true], closed: ["closed_at", false], all: ["last_activity_at", false],
};

async function idsByMessageText(q: string): Promise<string[]> {
  const { data, error } = await db().from("inquiry_messages").select("inquiry_id").ilike("body_text", `%${q}%`).limit(200);
  if (error) fail("message search", error);
  return [...new Set(((data ?? []) as Array<{ inquiry_id: string }>).map((r) => r.inquiry_id))];
}

export async function listInquiries(f: { tab: Exclude<Tab, "unmatched">; topic: Topic | null; q: string; page: number }): Promise<{ rows: InquiryRow[]; total: number }> {
  const q = cleanSearch(f.q);
  const ids = q && !parseRef(q) ? await idsByMessageText(q) : [];
  let qb = db().from("inquiries").select(COLS, { count: "exact" }).in("status", statusesForTab(f.tab));
  if (f.topic) qb = qb.eq("topic", f.topic);
  if (q) {
    const ref = parseRef(q);
    if (ref) qb = qb.eq("ref", ref);
    else {
      const like = `%${q}%`;
      qb = qb.or([`name.ilike.${like}`, `email.ilike.${like}`, `organization.ilike.${like}`, `order_number.ilike.${like}`, `subject.ilike.${like}`,
        ...(ids.length ? [`id.in.(${ids.join(",")})`] : [])].join(","));
    }
  }
  const [col, asc] = ORDER[f.tab];
  const from = (f.page - 1) * INQUIRIES_PER_PAGE;
  const { data, error, count } = await qb.order(col, { ascending: asc, nullsFirst: false }).order("ref", { ascending: false }).range(from, from + INQUIRIES_PER_PAGE - 1);
  if (error) fail("inquiries list", error);
  return { rows: (data ?? []) as InquiryRow[], total: count ?? 0 };
}

export async function inquiryTabCounts(): Promise<Record<Tab, number>> {
  const n = async (statuses: Status[]) => {
    const { count, error } = await db().from("inquiries").select("id", { count: "exact", head: true }).in("status", statuses);
    if (error) fail("inquiry count", error);
    return count ?? 0;
  };
  const [open, waiting, closed, unmatched] = await Promise.all([
    n(["new", "needs_reply"]), n(["waiting"]), n(["closed"]),
    (async () => {
      const { count, error } = await db().from("inquiry_unmatched").select("id", { count: "exact", head: true })
        .is("dismissed_at", null).is("attached_to", null).eq("spam", false);
      if (error) fail("unmatched count", error);
      return count ?? 0;
    })(),
  ]);
  return { open, waiting, closed, all: open + waiting + closed, unmatched };
}

export type ThreadFile = { id: string; filename: string; content_type: string; size_bytes: number; url: string | null };
export type ThreadMessage = {
  id: string; direction: "in" | "out"; source: "form" | "email" | "admin"; from_email: string; body_text: string; full_text: string | null;
  delivery: "sending" | "sent" | "delivered" | "bounced" | "complained" | null; flags: string[]; dropped_attachments: string[];
  created_at: string; authorName: string | null; files: ThreadFile[];
};
export type ThreadEvent = { id: string; action: string; detail: string | null; at: string; actorName: string | null };

async function names(ids: Array<string | null>): Promise<Map<string, string>> {
  const uniq = [...new Set(ids.filter((x): x is string => !!x))];
  const out = new Map<string, string>();
  if (!uniq.length) return out;
  const { data, error } = await db().from("customers").select("id, full_name").in("id", uniq);
  if (error) fail("names read", error);
  for (const c of (data ?? []) as Array<{ id: string; full_name: string }>) out.set(c.id, c.full_name.split(" ")[0] || c.full_name);
  return out;
}

export async function getThread(ref: number): Promise<{ inquiry: ThreadInquiry; messages: ThreadMessage[]; events: ThreadEvent[] } | null> {
  const inquiry = await getInquiry({ ref });
  if (!inquiry) return null;
  const [{ data: ms, error: mErr }, { data: es, error: eErr }] = await Promise.all([
    db().from("inquiry_messages").select("*, inquiry_attachments(id, filename, content_type, size_bytes, storage_path)")
      .eq("inquiry_id", inquiry.id).or("delivery.is.null,delivery.neq.sending").order("created_at", { ascending: true }),
    db().from("inquiry_events").select("id, action, detail, at, actor").eq("inquiry_id", inquiry.id).order("at", { ascending: false }),
  ]);
  if (mErr) fail("thread messages read", mErr);
  if (eErr) fail("thread events read", eErr);
  type RawMsg = Omit<ThreadMessage, "authorName" | "files"> & { author_id: string | null; inquiry_attachments: Array<Omit<ThreadFile, "url"> & { storage_path: string }> };
  const rawMs = (ms ?? []) as RawMsg[];
  const rawEs = (es ?? []) as Array<Omit<ThreadEvent, "actorName"> & { actor: string | null }>;
  const who = await names([...rawMs.map((m) => m.author_id), ...rawEs.map((e) => e.actor)]);
  const paths = rawMs.flatMap((m) => m.inquiry_attachments.map((a) => a.storage_path));
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data, error } = await db().storage.from(FILES_BUCKET).createSignedUrls(paths, FILE_LINK_SECONDS);
    if (error) fail("file links", error);
    for (const s of (data ?? []) as Array<{ path: string | null; signedUrl: string }>) if (s.path) urls.set(s.path, s.signedUrl);
  }
  return {
    inquiry,
    messages: rawMs.map(({ author_id, inquiry_attachments, ...m }) => ({
      ...m, authorName: author_id ? who.get(author_id) ?? "Someone" : null,
      files: inquiry_attachments.map(({ storage_path, ...a }) => ({ ...a, url: urls.get(storage_path) ?? null })),
    })),
    events: rawEs.map(({ actor, ...e }) => ({ ...e, actorName: actor ? who.get(actor) ?? "Someone" : null })),
  };
}

// RFC Message-IDs in the thread, oldest first (In-Reply-To / References).
export async function threadMessageIds(inquiryId: string): Promise<string[]> {
  const { data, error } = await db().from("inquiry_messages").select("email_message_id").eq("inquiry_id", inquiryId)
    .not("email_message_id", "is", null).order("created_at", { ascending: true });
  if (error) fail("thread ids read", error);
  return ((data ?? []) as Array<{ email_message_id: string }>).map((r) => r.email_message_id);
}

// ---------- status: the only writer of inquiries.status (besides SQL) ----------
// Read → nextStatus → update only if the status is still what we read; a
// concurrent change (a customer reply landing) makes it re-read, up to 3 times.
export async function applyInquiryEvent(id: string, e: InquiryEventName, opts: { actorId?: string | null } = {}): Promise<{ from: Status; to: Status } | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await db().from("inquiries").select("status").eq("id", id).maybeSingle();
    if (error) fail("inquiry status read", error);
    if (!data) return null;
    const from = (data as { status: Status }).status;
    const to = nextStatus(from, e);
    if (!to) return null;
    const now = nowIso();
    const patch = to === "waiting" ? { status: to, waiting_since: now, closed_at: null, closed_by: null }
      : to === "closed" ? { status: to, closed_at: now, closed_by: opts.actorId ?? null, waiting_since: null }
      : { status: to, waiting_since: null, closed_at: null, closed_by: null };
    const { data: upd, error: uErr } = await db().from("inquiries").update(patch).eq("id", id).eq("status", from).select("id");
    if (uErr) fail("inquiry status update", uErr);
    if (Array.isArray(upd) && upd.length === 1) return { from, to };
  }
  throw new Error(`inquiry ${id}: status kept changing during "${e}"`);
}

export async function logInquiryEvent(e: { inquiryId: string | null; action: string; actorId?: string | null; detail?: string | null }): Promise<void> {
  const { error } = await db().from("inquiry_events").insert({ inquiry_id: e.inquiryId, action: e.action, actor: e.actorId ?? null, detail: e.detail ?? null });
  if (error) fail("inquiry event insert", error);
}

// After the fact (the email already went): a failed log alerts instead of throwing.
export async function recordInquiryEvent(e: Parameters<typeof logInquiryEvent>[0]): Promise<void> {
  try { await logInquiryEvent(e); }
  catch (err) { await alertOwner("Owner action not logged", `inquiry ${e.inquiryId ?? "—"} · ${e.action}: ${String(err)}`); }
}

// ---------- owner replies (claim → send → finish, like sendTracked) ----------
export async function claimReply(i: { inquiryId: string; clientKey: string; body: string; authorId: string; fromEmail: string }): Promise<string | "duplicate"> {
  const { data, error } = await db().from("inquiry_messages").insert({
    inquiry_id: i.inquiryId, direction: "out", source: "admin", from_email: i.fromEmail, body_text: i.body,
    client_key: i.clientKey, delivery: "sending", author_id: i.authorId,
  }).select("id").single();
  if (error) {
    if ((error as { code?: string }).code === "23505") return "duplicate";
    fail("reply claim", error);
  }
  return (data as { id: string }).id;
}

export async function finishReply(messageId: string, sesMessageId: string, headerId: string): Promise<void> {
  const { data, error } = await db().from("inquiry_messages").update({ delivery: "sent", ses_message_id: sesMessageId, email_message_id: headerId })
    .eq("id", messageId).eq("delivery", "sending").select("id");
  if (error || !Array.isArray(data) || data.length !== 1) fail("reply finish", error ?? "claim not found");
}

export async function releaseReply(messageId: string): Promise<void> {
  const { error } = await db().from("inquiry_messages").delete().eq("id", messageId).eq("delivery", "sending");
  if (error) fail(`reply release (delete claim ${messageId} to retry)`, error);
}

// ---------- thread details ----------
export async function setTopic(id: string, topic: Topic): Promise<boolean> {
  const { data, error } = await db().from("inquiries").update({ topic }).eq("id", id).neq("topic", topic).select("id");
  if (error) fail("topic update", error);
  return Array.isArray(data) && data.length === 1;
}

export async function setCustomer(id: string, customerId: string | null): Promise<void> {
  const { error } = await db().from("inquiries").update({ customer_id: customerId }).eq("id", id);
  if (error) fail("customer link update", error);
}

// ---------- inbound mail ----------
export async function seenSesMessage(sesMessageId: string): Promise<boolean> {
  const [a, b] = await Promise.all([
    db().from("inquiry_messages").select("id", { count: "exact", head: true }).eq("ses_message_id", sesMessageId),
    db().from("inquiry_unmatched").select("id", { count: "exact", head: true }).eq("ses_message_id", sesMessageId),
  ]);
  if (a.error) fail("seen message check", a.error);
  if (b.error) fail("seen unmatched check", b.error);
  return (a.count ?? 0) + (b.count ?? 0) > 0;
}

export type InboundFile = { filename: string; content_type: string; size_bytes: number; storage_path: string };
export async function recordInbound(i: {
  inquiryId: string; sesMessageId: string; fromEmail: string; body: string; full: string | null; rawKey: string | null;
  emailMessageId: string | null; flags: string[]; dropped: string[]; files: InboundFile[]; actorId?: string | null;
}): Promise<"recorded" | "duplicate"> {
  const { data, error } = await db().rpc("record_inbound_message", {
    p_inquiry: i.inquiryId, p_ses_message_id: i.sesMessageId, p_from: i.fromEmail, p_body: i.body, p_full: i.full, p_raw_key: i.rawKey,
    p_email_message_id: i.emailMessageId, p_flags: i.flags, p_dropped: i.dropped, p_attachments: i.files, p_actor: i.actorId ?? null,
  });
  if (error) fail("record_inbound_message", error);
  return data === "duplicate" ? "duplicate" : "recorded";
}

export async function uploadInquiryFile(path: string, bytes: Uint8Array, contentType: string): Promise<void> {
  const { error } = await db().storage.from(FILES_BUCKET).upload(path, bytes, { contentType, upsert: true });
  if (error) fail(`file upload ${path}`, error);
}

export type UnmatchedRow = {
  id: string; ses_message_id: string; from_email: string; from_name: string | null; to_address: string | null; subject: string;
  body_text: string; full_text: string | null; raw_key: string | null; spam: boolean; attachment_names: string[]; created_at: string;
};
export async function recordUnmatched(r: Omit<UnmatchedRow, "id" | "created_at">): Promise<void> {
  const { error } = await db().from("inquiry_unmatched").upsert(r, { onConflict: "ses_message_id", ignoreDuplicates: true });
  if (error) fail("unmatched insert", error);
}

export async function listUnmatched(): Promise<{ open: UnmatchedRow[]; spam: UnmatchedRow[] }> {
  const { data, error } = await db().from("inquiry_unmatched").select("*").is("dismissed_at", null).is("attached_to", null)
    .order("created_at", { ascending: false }).limit(200);
  if (error) fail("unmatched list", error);
  const rows = (data ?? []) as UnmatchedRow[];
  return { open: rows.filter((r) => !r.spam), spam: rows.filter((r) => r.spam) };
}

export async function getUnmatched(id: string): Promise<UnmatchedRow | null> {
  const { data, error } = await db().from("inquiry_unmatched").select("*").eq("id", id).is("dismissed_at", null).is("attached_to", null).maybeSingle();
  if (error) fail("unmatched read", error);
  return (data as UnmatchedRow | null) ?? null;
}

export async function closeUnmatched(id: string, v: { dismissedBy: string } | { attachedTo: string }): Promise<boolean> {
  const patch = "dismissedBy" in v ? { dismissed_at: nowIso(), dismissed_by: v.dismissedBy } : { attached_to: v.attachedTo };
  const { data, error } = await db().from("inquiry_unmatched").update(patch).eq("id", id).is("dismissed_at", null).is("attached_to", null).select("id");
  if (error) fail("unmatched update", error);
  return Array.isArray(data) && data.length === 1;
}

// ---------- SES delivery events on our replies ----------
// Returns the inquiry id when the message was one of ours.
export async function markOutboundDelivery(sesMessageId: string, kind: "delivered" | "bounced" | "complained"): Promise<string | null> {
  const from = kind === "delivered" ? ["sent"] : ["sent", "delivered"];
  if (kind === "delivered") {
    const { data, error } = await db().from("inquiry_messages").update({ delivery: kind })
      .eq("ses_message_id", sesMessageId).eq("direction", "out").in("delivery", from).select("inquiry_id");
    if (error) fail("delivery update", error);
    return ((data ?? []) as Array<{ inquiry_id: string }>)[0]?.inquiry_id ?? null;
  }
  // bounced / complained: the thread move + log run BEFORE the delivery
  // column flips, not after. Flipping first and moving/logging second meant
  // a crash in between (SNS retries on our 500) would re-arrive to a row no
  // longer matching delivery IN (sent, delivered) — found nothing, and
  // silently never moved the thread or logged the bounce. Logging first
  // risks a duplicate "Reply bounced" line on a genuine retry, never a lost
  // one: a loud double beats a silent miss.
  const { data: rows, error: rErr } = await db().from("inquiry_messages").select("inquiry_id")
    .eq("ses_message_id", sesMessageId).eq("direction", "out").in("delivery", from);
  if (rErr) fail("delivery read", rErr);
  const row = ((rows ?? []) as Array<{ inquiry_id: string }>)[0];
  if (!row) return null;
  await applyInquiryEvent(row.inquiry_id, "bounced");
  await logInquiryEvent({ inquiryId: row.inquiry_id, action: "bounced", detail: kind });
  const { data, error } = await db().from("inquiry_messages").update({ delivery: kind })
    .eq("ses_message_id", sesMessageId).eq("direction", "out").in("delivery", from).select("inquiry_id");
  if (error) fail("delivery update", error);
  return ((data ?? []) as Array<{ inquiry_id: string }>)[0]?.inquiry_id ?? row.inquiry_id;
}

// ---------- saved replies ----------
export type SavedReply = { id: string; name: string; body: string; updated_at: string; updated_by: string | null; updatedByName: string | null };
export async function listSavedReplies(): Promise<SavedReply[]> {
  const { data, error } = await db().from("saved_replies").select("*").order("name", { ascending: true });
  if (error) fail("saved replies read", error);
  const rows = (data ?? []) as Array<Omit<SavedReply, "updatedByName">>;
  const who = await names(rows.map((r) => r.updated_by));
  return rows.map((r) => ({ ...r, updatedByName: r.updated_by ? who.get(r.updated_by) ?? null : null }));
}

export async function saveSavedReply(r: { id: string | null; name: string; body: string; actorId: string }): Promise<"ok" | "name_taken" | "missing"> {
  const row = { name: r.name, body: r.body, updated_at: nowIso(), updated_by: r.actorId };
  const { data, error } = r.id
    ? await db().from("saved_replies").update(row).eq("id", r.id).select("id")
    : await db().from("saved_replies").insert(row).select("id");
  if (error) {
    if ((error as { code?: string }).code === "23505") return "name_taken";
    fail("saved reply save", error);
  }
  return Array.isArray(data) && data.length === 1 ? "ok" : "missing";
}

export async function deleteSavedReply(id: string): Promise<string | null> {
  const { data, error } = await db().from("saved_replies").delete().eq("id", id).select("name");
  if (error) fail("saved reply delete", error);
  return ((data ?? []) as Array<{ name: string }>)[0]?.name ?? null;
}

// ---------- auto-close (reconcile cron) ----------
export async function autoCloseInquiries(nowMs: number): Promise<number> {
  const { data, error } = await db().rpc("auto_close_inquiries", { p_before: new Date(nowMs - INQUIRY_AUTO_CLOSE_DAYS * 86_400_000).toISOString() });
  if (error) fail("auto_close_inquiries", error);
  return Number(data ?? 0);
}

// ---------- Today and the nav ----------
export type InquiryTodo = Pick<InquiryRow, "ref" | "topic" | "name" | "organization" | "last_preview" | "last_customer_at" | "created_at" | "file_count" | "status" | "waiting_since">;
export async function openInquiryTodos(): Promise<{ count: number; oldest: InquiryTodo[] }> {
  const { data, error, count } = await db().from("inquiries")
    .select("ref, topic, name, organization, last_preview, last_customer_at, created_at, file_count, status, waiting_since", { count: "exact" })
    .in("status", ["new", "needs_reply"]).order("last_customer_at", { ascending: true, nullsFirst: false }).limit(INQUIRY_PREVIEWS);
  if (error) fail("open inquiries read", error);
  return { count: count ?? 0, oldest: (data ?? []) as InquiryTodo[] };
}

export async function inquiriesNavCount(): Promise<number> {
  try {
    const { count, error } = await db().from("inquiries").select("id", { count: "exact", head: true }).in("status", ["new", "needs_reply"]);
    if (error) throw new Error(JSON.stringify(error));
    return count ?? 0;
  } catch (err) {
    console.error("inquiries nav count failed:", err);
    return 0;
  }
}
