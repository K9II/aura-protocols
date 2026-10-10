import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import type { Competitor, Fulfillment } from "@/lib/wholesale/margins";

// The AIOS reference figures for the owner's margins page (aios-reference.sql),
// copied by scripts/sync-supplier-prices.mjs. A part never synced comes back null
// and the page says so; a read error throws.
export type AiosReference = {
  fulfillment: Fulfillment | null;
  glpPct: number | null;
  competitors: Record<string, Competitor[]>;
  lab: { name: string; flatCents: number | null; perStrength: Record<string, number> } | null;
  syncedAt: string | null;
};

export async function aiosReference(): Promise<AiosReference> {
  const { data, error } = await getSupabaseAdminClient().from("aios_reference").select("kind, data, synced_at");
  if (error) throw new Error(`margins reference read failed: ${JSON.stringify(error)}`);
  const rows = (data ?? []) as Array<{ kind: string; data: Record<string, unknown>; synced_at: string }>;
  const get = (k: string) => rows.find((r) => r.kind === k)?.data ?? null;
  const proc = get("processor") as { glpPct?: number } | null;
  return {
    fulfillment: get("fulfillment") as Fulfillment | null,
    glpPct: typeof proc?.glpPct === "number" ? proc.glpPct : null,
    competitors: (get("competitors") ?? {}) as Record<string, Competitor[]>,
    lab: get("lab") as AiosReference["lab"],
    syncedAt: rows.map((r) => r.synced_at).sort().at(-1) ?? null,
  };
}
