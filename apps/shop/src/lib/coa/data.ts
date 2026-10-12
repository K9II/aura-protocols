// src/lib/coa/data.ts — labs, the COA switches and certificate writes. Server only.
import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { CERT_COLS, certNum } from "@/lib/catalog-ops/data";
import type { CertValue, LabValue } from "@/lib/coa/rules";
import { COA_DEFAULTS, type CertRow, type CoaSettings } from "@/lib/coa/visibility";

const db = () => getSupabaseAdminClient();
const fail = (what: string, error: unknown): never => { throw new Error(`${what} failed: ${JSON.stringify(error)}`); };
const code = (e: unknown) => (e as { code?: string } | null)?.code;
const locked = (e: unknown) => /certificate_locked/.test(JSON.stringify(e ?? ""));

export type Lab = { id: string; name: string; city: string | null; verify_url_template: string | null; verify_hint: string | null; iso17025: boolean; active: boolean; certificates: number };

export async function listLabs(): Promise<Lab[]> {
  const { data, error } = await db().from("labs").select("id, name, city, verify_url_template, verify_hint, iso17025, active, lot_certificates(count)").order("active", { ascending: false }).order("name");
  if (error) fail("labs read", error);
  return ((data ?? []) as Array<Omit<Lab, "certificates"> & { lot_certificates: Array<{ count: number }> }>)
    .map(({ lot_certificates, ...l }) => ({ ...l, certificates: lot_certificates[0]?.count ?? 0 }));
}

export async function saveLab(id: string | null, v: LabValue): Promise<{ ok: true } | { ok: false; taken: true }> {
  const row = { name: v.name, city: v.city, verify_url_template: v.verifyUrlTemplate, verify_hint: v.verifyHint, iso17025: v.iso17025, updated_at: new Date().toISOString() };
  const { error } = id ? await db().from("labs").update(row).eq("id", id) : await db().from("labs").insert(row);
  if (code(error) === "23505") return { ok: false, taken: true };
  if (error) fail("lab save", error);
  return { ok: true };
}

export async function setLabActive(id: string, active: boolean): Promise<void> {
  const { error } = await db().from("labs").update({ active, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) fail("lab active", error);
}

export async function coaSettings(): Promise<CoaSettings> {
  const { data, error } = await db().from("shop_settings").select("coa_show_all, coa_show_measured").eq("id", true).single();
  if (error) fail("coa settings read", error);
  const d = data as { coa_show_all: boolean; coa_show_measured: boolean } | null;
  return d ? { showAll: d.coa_show_all, showMeasured: d.coa_show_measured } : COA_DEFAULTS;
}

export async function setCoaSetting(key: keyof CoaSettings, on: boolean): Promise<void> {
  const col = key === "showAll" ? "coa_show_all" : "coa_show_measured";
  const { error } = await db().from("shop_settings").update({ [col]: on }).eq("id", true);
  if (error) fail("coa setting", error);
}

// Every certificate of a lot that isn't a draft — the pool visibleCerts()
// chooses from for the whole store. Used to count how many certificates the
// "Show every certificate" switch is currently hiding.
export async function allPublicCertRows(): Promise<CertRow[]> {
  const { data, error } = await db().from("lot_certificates").select(`${CERT_COLS}, lots!inner(status)`).neq("lots.status", "draft");
  if (error) fail("certificates read", error);
  return ((data ?? []) as unknown as Array<CertRow & { lots?: unknown }>).map(({ lots: _l, ...r }) => certNum(r as CertRow));
}

// Every certificate of a product's lots (drafts included), newest first.
export async function adminCertificates(slug: string): Promise<CertRow[]> {
  const { data, error } = await db().from("lot_certificates").select(`${CERT_COLS}, lots!inner(slug)`).eq("lots.slug", slug)
    .order("tested_on", { ascending: false }).order("created_at", { ascending: false });
  if (error) fail("certificates read", error);
  return ((data ?? []) as unknown as Array<CertRow & { lots?: unknown }>).map(({ lots: _l, ...r }) => certNum(r as CertRow));
}

export async function certificateById(id: string): Promise<(CertRow & { lot_number: string; slug: string; variant_id: string; lot_status: string }) | null> {
  const { data, error } = await db().from("lot_certificates").select(`${CERT_COLS}, lots!inner(lot_number, slug, variant_id, status)`).eq("id", id).maybeSingle();
  if (error) fail("certificate read", error);
  if (!data) return null;
  const { lots, ...r } = data as unknown as CertRow & { lots: { lot_number: string; slug: string; variant_id: string; status: string } };
  return { ...certNum(r as CertRow), lot_number: lots.lot_number, slug: lots.slug, variant_id: lots.variant_id, lot_status: lots.status };
}

const columns = (v: CertValue) => ({
  lab_id: v.labId, report_number: v.reportNumber, verify_code: v.verifyCode, tested_on: v.testedOn, coa_path: v.coaPath,
  purity_pct: v.purityPct, method: v.method, measured_mg: v.measuredMg, ...v.tests, result: v.result, note: v.note,
});

async function logEvent(e: { slug: string; variant_id: string; lot_id: string; kind: string; before?: unknown; after?: unknown; note?: string | null; actor_id: string }) {
  const { error } = await db().from("catalog_events").insert({ source: "manual", ...e });
  if (error) fail(`catalog event ${e.kind}`, error);
}

type Lot = { id: string; slug: string; variant_id: string };

export async function addCertificate(lot: Lot, v: CertValue, actorId: string): Promise<{ ok: true; id: string } | { ok: false; taken: true }> {
  const { data, error } = await db().from("lot_certificates").insert({ lot_id: lot.id, ...columns(v), created_by: actorId }).select("id").single();
  if (code(error) === "23505") return { ok: false, taken: true };
  if (error || !data) fail("certificate insert", error);
  await logEvent({ slug: lot.slug, variant_id: lot.variant_id, lot_id: lot.id, kind: "certificate_added", actor_id: actorId,
    after: { lab: v.labId, report: v.reportNumber, result: v.result } });
  return { ok: true, id: (data as { id: string }).id };
}

export async function updateDraftCertificate(id: string, lot: Lot, v: CertValue, actorId: string): Promise<{ ok: true } | { ok: false; taken?: true; locked?: true }> {
  const { error } = await db().from("lot_certificates").update(columns(v)).eq("id", id);
  if (code(error) === "23505") return { ok: false, taken: true };
  if (locked(error)) return { ok: false, locked: true };
  if (error) fail("certificate update", error);
  await logEvent({ slug: lot.slug, variant_id: lot.variant_id, lot_id: lot.id, kind: "certificate_edited", actor_id: actorId, after: { report: v.reportNumber } });
  return { ok: true };
}

export async function deleteDraftCertificate(id: string, lot: Lot, report: string, actorId: string): Promise<{ ok: boolean }> {
  const { error } = await db().from("lot_certificates").delete().eq("id", id);
  if (locked(error)) return { ok: false };
  if (error) fail("certificate delete", error);
  await logEvent({ slug: lot.slug, variant_id: lot.variant_id, lot_id: lot.id, kind: "certificate_deleted", actor_id: actorId, before: { report } });
  return { ok: true };
}

export async function addCorrection(id: string, lot: Lot, before: string | null, note: string, actorId: string): Promise<void> {
  const { error } = await db().from("lot_certificates").update({ correction_note: note, corrected_at: new Date().toISOString(), corrected_by: actorId }).eq("id", id);
  if (error) fail("certificate correction", error);
  await logEvent({ slug: lot.slug, variant_id: lot.variant_id, lot_id: lot.id, kind: "certificate_corrected", actor_id: actorId,
    before: { correction: before }, after: { correction: note } });
}
